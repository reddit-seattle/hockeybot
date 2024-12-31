import { ThreadChannel, EmbedBuilder, Message, MessageCreateOptions, MessageEditOptions } from "discord.js";
import { ScheduleOptions, ScheduledTask, schedule } from "node-cron";
import { API } from "../service/API";
import { Play, PlayByPlayResponse, RosterPlayer, Team } from "../service/models/responses/PlayByPlayResponse";
import { getSituationCodeString, isGameOver, periodToStr } from "../utils/helpers";
import { EventTypeCode } from "../utils/enums";
import { Kraken } from "../utils/constants";
import { Strings } from "../utils/constants";
import { PeriodDescriptor } from "../service/models/responses/PlayByPlayResponse";
import { contains } from "underscore";

const tracked_types = [EventTypeCode.goal, EventTypeCode.penalty, EventTypeCode.periodStart, EventTypeCode.periodEnd, EventTypeCode.gameEnd];

interface PlayMessageContainer {
    message?: Message;
    play: Play;
}

/** 
* TODO - announce challenges / goal removals / unsuccessful challenges?
*/

export class GameFeedManager {
    private CRON: string = "*/10 * * * * *";

    private taskOptions: ScheduleOptions = { scheduled: true, timezone: "America/Los_Angeles" };

    private task: ScheduledTask;
    private thread: ThreadChannel;
    private gameId: string;
    private feed?: PlayByPlayResponse;

    // In case we start in the middle of a game (crash / reboot / etc) we don't want to announce all the goals / penalties again
    private events: Map<string, PlayMessageContainer> = new Map<string, PlayMessageContainer>();
    private teamsMap: Map<string, Team> = new Map<string, Team>();
    private roster: Map<string, RosterPlayer> = new Map<string, RosterPlayer>();

    constructor(thread: ThreadChannel, gameId: string, taskOptions?: ScheduleOptions, cron?: string) {
        this.thread = thread;
        this.gameId = gameId;
        // force update feed
        this.getFeed(true);
        if (taskOptions) {
            this.taskOptions = taskOptions;
        }
        if (cron) {
            this.CRON = cron;
        }
        // get teams and roster and store them
        this.getTeamsAndRoster();

        // start the task
        this.task = schedule(this.CRON, this.checkGameStatus, this.taskOptions);
    }

    private getTeamsAndRoster = async () => {
        const game = await API.Games.GetPlays(this.gameId);
        const { awayTeam, homeTeam, rosterSpots } = game;
        this.teamsMap.set(awayTeam.id, awayTeam);
        this.teamsMap.set(homeTeam.id, homeTeam);
        rosterSpots.forEach((player) => {
            this.roster.set(player.playerId, player);
        });
    };

    private checkGameStatus = async () => {
        const game = await API.Games.GetBoxScore(this.gameId);
        const { gameState, gameDate, awayTeam, homeTeam } = game;

        // Check for game end state on box score
        if (isGameOver(gameState)) {
            await this.thread?.setArchived(true, "game over").catch(console.error);
            await this.task.stop();
            return;
        }

        // #region logging
        console.log(
            `LIVE GAME FEED CHECKER FOR ID: ${this.gameId}, (${awayTeam.abbrev} at ${homeTeam.abbrev}) @ ${gameDate}`
        );
        console.dir(game);
        console.log("--------------------------------------------------");
        console.log(
            `Score: ${awayTeam.commonName.default} ${awayTeam?.score || 0}, ${homeTeam.commonName.default} ${homeTeam?.score || 0
            }`
        );
        console.log("--------------------------------------------------");
        // #endregion

        // game feed
        const feed = await this.getFeed(true);
        console.dir(feed);
        const { plays } = feed;

        const goals = [];
        const penalties = [];
        const clockEvents = [];

        // parse plays once into buckets
        for (const play of plays) {
            const { typeCode } = play;
            // skip if it's not an event we care about
            if (!tracked_types.includes(typeCode)) {
                continue;
            }
            switch (typeCode) {
                case EventTypeCode.goal:
                    goals.push(play);
                    this.processGoal(play);
                    break;
                case EventTypeCode.penalty:
                    penalties.push(play);
                    this.processPenalty(play);
                    break;
                case EventTypeCode.periodStart:
                case EventTypeCode.periodEnd:
                case EventTypeCode.gameEnd:
                    clockEvents.push(play);
                    this.processClockEvent(play);
                    break;
                default:
                    break;
            }
        }
    };

    private getFeed = async (force: boolean = false): Promise<PlayByPlayResponse> => {
        if (force || !this.feed) {
            const feed = await API.Games.GetPlays(this.gameId);
            // first time we're setting feed, log all plays we are about 
            if (!this.feed) {
                for (const play of feed.plays) {
                    if (tracked_types.includes(play.typeCode)) {
                        this.events.set(play.eventId, { message: undefined, play: play });
                    }
                }
            }
            this.feed = feed;
        }
        return this.feed;
    };

    private createScoreEmbed = async () => {
        const { awayTeam: away, homeTeam: home, periodDescriptor, clock } = await this.getFeed();
        const { timeRemaining, inIntermission} = clock;
        const { score: homeScore, sog: homeSOG } = home;
        const { score: awayScore, sog: awaySOG } = away;
        const timeRemainingString = `${timeRemaining} remaining in the ${periodToStr(
            periodDescriptor.number || 1,
            periodDescriptor.periodType || "REG"
        )} ${inIntermission ? "intermission" : "period"}`;

        const title = `${away.commonName.default} at ${home.commonName.default}`;
        const scoreFields = [
            {
                name: `**${away.commonName.default}**`,
                value: `Goals: **${awayScore}**\nShots: ${awaySOG}`,
                inline: true,
            },
            {
                name: `**${home.commonName.default}**`,
                value: `Goals: **${homeScore}**\nShots: ${homeSOG}`,
                inline: true,
            },
        ];
        return new EmbedBuilder()
            .setTitle(title)
            .addFields(scoreFields)
            .setFooter({ text: timeRemainingString })
            .setColor(39129);
    };

    private createPenaltyEmbed = async (penalty: Play) => {
        const { details } = penalty;
        if (!details) {
            return;
        }
        // we like the kraken (reverse penalty edition)
        const excitement = details?.eventOwnerTeamId != Kraken.TeamId;
        const { committedByPlayerId, servedByPlayerId, drawnByPlayerId, eventOwnerTeamId, descKey, } =
            details ?? {};
        const penaltyPlayer = this.roster.get(committedByPlayerId ?? servedByPlayerId ?? "");
        const drawnByPlayer = this.roster.get(drawnByPlayerId ?? "");
        const penaltyTeam = this.teamsMap.get(eventOwnerTeamId ?? "");

        // Seattle Kraken penalty(!)

        const title = `${penaltyTeam?.placeName.default} ${penaltyTeam?.commonName.default} penalty${excitement ? "!" : ""}`;
        const fields = [];
        // Penalty Description
        const penaltyTypeKeys = Object.keys(Strings.PENALTY_STRINGS);
        const penaltyDescription = descKey && contains(penaltyTypeKeys, descKey)
            ? Strings.PENALTY_STRINGS[descKey as keyof typeof Strings.PENALTY_STRINGS]
            : "Unknown penalty";
        fields.push({
            name: "Infraction:",
            value: penaltyDescription,
        });

        // committed or served
        const servedByString = `${committedByPlayerId ? "Committed" : "Served"} by`;
        if (penaltyPlayer) {
            fields.push({
                name: servedByString,
                value: `${penaltyPlayer?.firstName.default} ${penaltyPlayer?.lastName.default}`,
            });
        }
        if (drawnByPlayer) {
            fields.push({
                name: "Drawn by:",
                value: `${drawnByPlayer?.firstName.default} ${drawnByPlayer?.lastName.default}`,
            });
        }

        const { timeRemaining, periodDescriptor } = penalty;
        const timeRemainingString = `${timeRemaining} remaining in the ${periodToStr(
            periodDescriptor.number || 1,
            periodDescriptor.periodType || "REG"
        )} period`;

        return new EmbedBuilder()
            .setTitle(title)
            .setThumbnail(penaltyPlayer?.headshot ?? "")
            .addFields(fields)
            .setFooter({ text: timeRemainingString })
            .setColor(39129);
    };

    private createGoalEmbed = async (goal: Play) => {
        const { details } = goal;
        if (!details) {
            return;
        }
        const { scoringPlayerId, assist1PlayerId, assist2PlayerId } = details;
        const scorer = this.roster.get(scoringPlayerId ?? "");
        const assist1 = this.roster.get(assist1PlayerId ?? "");
        const assist2 = this.roster.get(assist2PlayerId ?? "");

        const scoringTeam = this.teamsMap.get(goal.details?.eventOwnerTeamId ?? "");
        const { id: scoringTeamId } = scoringTeam ?? {};
        // we like the kraken
        const excitement = scoringTeamId == Kraken.TeamId;
        const goalString = `${excitement ? "GOAL!" : "goal"}`;

        // this is absolutely the worst way to do this
        // do not look at this code
        const { situationCode, homeTeamDefendingSide } = goal;
        const homeLeft = homeTeamDefendingSide == "left";
        const { awayTeam: away, homeTeam: home } = await this.getFeed();
        const { id: homeTeamId } = home;

        const homeScored = homeTeamId == scoringTeamId;
        const leftScored = homeScored ? homeLeft : !homeLeft;
        const goalphrase = getSituationCodeString(situationCode, leftScored);

        let title = `${scoringTeam?.placeName.default} ${scoringTeam?.commonName.default} ${goalString}`;
        if (excitement) {
            title = `${Strings.REDLIGHT_EMBED} ${title} ${Strings.REDLIGHT_EMBED}`;
        }
        const unassisted = !assist1 && !assist2;
        const description = scorer ?`${excitement ? "## " : ""}${scorer.firstName.default} ${scorer.lastName.default} (${goal.details?.scoringPlayerTotal})` : "Unknown player";
        const shotType = goal.details?.shotType;
        const goalTypeKeys = Object.keys(Strings.GOAL_TYPE_STRINGS);
        const shotTypeString = (shotType && contains(goalTypeKeys, shotType))
            ? Strings.GOAL_TYPE_STRINGS[shotType as keyof typeof Strings.GOAL_TYPE_STRINGS]  :
            "Unknown shot type";
        const secondaryDescription = `${shotTypeString}${unassisted ? ` - Unassisted` : ""}${goalphrase ? ` - ${goalphrase}` : ""}`;

        const fields = [];
        if (assist1) {
            fields.push({
                name: "1st Assist:",
                value: `${assist1?.firstName.default} ${assist1?.lastName.default} (${goal.details?.assist1PlayerTotal})`,
            });
        }
        if (assist2) {
            fields.push({
                name: "2nd Assist:",
                value: `${assist2?.firstName.default} ${assist2?.lastName.default} (${goal.details?.assist2PlayerTotal})`,
            });
        }
        fields.push(
            {
                name: `**${away.commonName.default}**`,
                value: `Goals: **${away.score}**\nShots: ${away.sog}`,
                inline: true,
            },
            {
                name: `**${home.commonName.default}**`,
                value: `Goals: **${home.score}**\nShots: ${home.sog}`,
                inline: true,
            }
        );

        const { periodDescriptor, timeRemaining } = goal;
        const timeRemainingString = `${timeRemaining} remaining in the ${periodToStr(
            periodDescriptor.number || 1,
            periodDescriptor.periodType || "REG"
        )} period`;
        return new EmbedBuilder()
            .setTitle(title)
            .setThumbnail(scorer?.headshot ?? "")
            .setDescription(`${description}\n${secondaryDescription}`)
            .addFields(fields)
            .setFooter({ text: timeRemainingString })
            .setColor(39129);
    };

    private processGoal = async (goal: Play) => {
        const embed = await this.createGoalEmbed(goal);
        embed && await this.updateEventAndProcessMessage(goal.eventId, goal, { embeds: [embed] });
    };

    private processPenalty = async (penalty: Play) => {
        const penaltyEmbed = await this.createPenaltyEmbed(penalty);
        penaltyEmbed && await this.updateEventAndProcessMessage(penalty.eventId, penalty, { embeds: [penaltyEmbed] });
    };

    private createPeriodUpdateMessage = async (periodDescriptor: PeriodDescriptor, descriptionStr: string) => {
        const scoreEmbed = await this.createScoreEmbed();
        const periodStartString = `${periodToStr(
            periodDescriptor.number || 1,
            periodDescriptor.periodType || "REG"
        )} period has ${descriptionStr}`;
        return {
            content: periodStartString,
            embeds: [scoreEmbed],
        } as MessageCreateOptions | MessageEditOptions;
    }

    private updateEventAndProcessMessage = async (eventId: string, play: Play, messageOpts?: MessageCreateOptions | MessageEditOptions) => {
        const event = this.events.get(eventId);
        const { message: existingMessage } = event ?? {};
        let message;
        if (!event) {
            // announce new event
            message = messageOpts && await this.thread?.send(messageOpts as MessageCreateOptions);
        }
        else if (existingMessage) {
            // the event is already in the feed, update the message
            message = messageOpts && await existingMessage?.edit(messageOpts as MessageEditOptions);
        }
        // update the local event object
        this.events.set(eventId, { message, play });
    };

    private processClockEvent = async (clockEvent: Play) => {
        const { periodDescriptor } = clockEvent;
        // exit if we don't have a period descriptor or if it's not a clock event we care about
        if (!periodDescriptor || !contains(tracked_types, clockEvent.typeCode)) {
            return;
        }
        let messageOpts: MessageCreateOptions | MessageEditOptions = {};
        switch (clockEvent.typeCode) {
            case EventTypeCode.periodStart:
                messageOpts = await this.createPeriodUpdateMessage(periodDescriptor, "started");
                break;
            case EventTypeCode.periodEnd:
                messageOpts = await this.createPeriodUpdateMessage(periodDescriptor, "ended");
                break;
            case EventTypeCode.gameEnd:
                await this.EndGame();
                break;
            default:
                break;
        }
        await this.updateEventAndProcessMessage(clockEvent.eventId, clockEvent, messageOpts);
    };

    private EndGame = async () => {
        const scoreEmbed = await this.createScoreEmbed();
        await this?.thread?.send({
            content: "Game has ended.",
            embeds: [scoreEmbed],
        });
        await this?.thread?.setArchived(true, "game over").catch(console.error);
        await this.Stop();
    };

    public Stop = () => {
        return this.task.stop();
    };
    public Start = () => {
        return this.task.start();
    };
    public Status = () => {
        return this.task.getStatus();
    };
}
