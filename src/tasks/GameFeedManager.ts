import { ThreadChannel, EmbedBuilder } from "discord.js";
import { ScheduleOptions, ScheduledTask, schedule } from "node-cron";
import { API } from "../service/API";
import { Play, PlayByPlayResponse, RosterPlayer, Team } from "../service/models/responses/PlayByPlayResponse";
import { getSituationCodeString, isGameOver, periodToStr } from "../utils/helpers";
import { EventTypeCode } from "../utils/enums";
import { Kraken } from "../utils/constants";
import { Strings } from "../utils/constants";
import { PeriodDescriptor } from "../service/models/responses/PlayByPlayResponse";
import _ from "underscore";

export class GameFeedManager {
    private CRON: string = "*/10 * * * * *";

    private taskOptions: ScheduleOptions = { scheduled: true, timezone: "America/Los_Angeles" };

    private task: ScheduledTask;
    private thread: ThreadChannel;
    private gameId: string;
    private feed?: PlayByPlayResponse;

    // In case we start in the middle of a game (crash / reboot / etc) we don't want to announce all the goals / penalties again
    private eventIds: Set<string> = new Set<string>();
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
            `Score: ${awayTeam.commonName.default} ${awayTeam?.score || 0}, ${homeTeam.commonName.default} ${
                homeTeam?.score || 0
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
            // skip if we saw this event already
            const { eventId, typeCode } = play;
            if (this.eventIds.has(eventId)) {
                continue;
            }
            this.eventIds.add(eventId);
            if (typeCode == EventTypeCode.goal) {
                goals.push(play);
            } else if (typeCode == EventTypeCode.penalty) {
                penalties.push(play);
            } else if (
                typeCode == EventTypeCode.periodStart ||
                typeCode == EventTypeCode.periodEnd ||
                typeCode == EventTypeCode.gameEnd
            ) {
                clockEvents.push(play);
            }
        }

        this.processClockEvents(clockEvents);
        // TODO - investigate duplicate goals (updated eventid, assists, etc)
        this.processGoals(goals);
        this.processPenalties(penalties);
    };

    private processPenalties = async (penalties: Play[]) => {
        for (const penalty of penalties) {
            await this.processPenalty(penalty);
        }
    };

    private getFeed = async (force: boolean = false): Promise<PlayByPlayResponse> => {
        if (force || !this.feed) {
            const feed = await API.Games.GetPlays(this.gameId);
            // first time we're setting feed, mark all plays as "seen"
            if (!this.feed) {
                for (const play of feed.plays) {
                    // TODO - may want to SKIP the first play (game / period start) in order to announce it
                    this.eventIds.add(play.eventId);
                }
            }
            this.feed = feed;
        }
        return this.feed;
    };

    private createScoreEmbed = async () => {
        const { awayTeam: away, homeTeam: home, periodDescriptor, clock } = await this.getFeed();
        const { timeRemaining } = clock;
        const { score: homeScore, sog: homeSOG } = home;
        const { score: awayScore, sog: awaySOG } = away;
        const timeRemainingString = `${timeRemaining} remaining in the ${periodToStr(
            periodDescriptor.number || 1,
            periodDescriptor.periodType || "REG"
        )} period`;

        const title = `${away.commonName.default} at ${home.commonName.default}`;
        return new EmbedBuilder()
            .setTitle(title)
            .addFields([
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
            ])
            .setFooter({ text: timeRemainingString })
            .setColor(39129);
    };

    private createPenaltyEmbed = async (penalty: Play) => {
        const { details } = penalty ?? {};
        // we like the kraken (reverse penalty edition)
        const excitement = details?.eventOwnerTeamId != Kraken.TeamId;
        const { committedByPlayerId, servedByPlayerId, drawnByPlayerId, eventOwnerTeamId, descKey, typeCode } =
            details ?? {};
        const penaltyPlayer = this.roster.get(committedByPlayerId ?? servedByPlayerId ?? "");
        const drawnByPlayer = this.roster.get(drawnByPlayerId ?? "");
        const penaltyTeam = this.teamsMap.get(eventOwnerTeamId ?? "");

        // Seattle Kraken penalty(!)
        const title = `${penaltyTeam?.placeName.default} ${penaltyTeam?.commonName.default} penalty${
            excitement ? "!" : ""
        }`;

        const fields = [];
        // Penalty Description
        const penaltyDescription =
            Strings.PENALTY_STRINGS[descKey as keyof typeof Strings.PENALTY_STRINGS] ?? "Unknown penalty";

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

        const { periodDescriptor, clock } = await this.getFeed();
        const { timeRemaining } = clock;
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
        const { scoringPlayerId, assist1PlayerId, assist2PlayerId } = goal.details ?? {};
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
        const { homeTeam } = await this.getFeed();
        const { id: homeTeamId } = homeTeam;

        const homeScored = homeTeamId == scoringTeamId;
        const leftScored = homeScored ? homeLeft : !homeLeft;
        const goalphrase = getSituationCodeString(situationCode, leftScored);

        let title = `${scoringTeam?.placeName.default} ${scoringTeam?.commonName.default} ${goalString}`;
        if (excitement) {
            title = `${Strings.REDLIGHT_EMBED} ${title} ${Strings.REDLIGHT_EMBED}`;
        }
        const unassisted = !assist1 && !assist2;
        const description = `${excitement ? "## " : ""}${scorer?.firstName.default} ${scorer?.lastName.default} (${
            goal.details?.scoringPlayerTotal
        })`;

        const shotType = `${
            Strings.GOAL_TYPE_STRINGS[goal.details?.shotType as keyof typeof Strings.GOAL_TYPE_STRINGS] ??
            goal.details?.shotType ??
            "Unknown shot type"
        }`;
        const secondaryDescription = `${shotType}${unassisted ? ` - Unassisted` : ""}${
            goalphrase ? ` - ${goalphrase}` : ""
        }`;

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
        const { awayTeam: away, homeTeam: home } = await this.getFeed();
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
        return new EmbedBuilder()
            .setTitle(title)
            .setThumbnail(scorer?.headshot ?? "")
            .setDescription(`${description}\n${secondaryDescription}`)
            .addFields(fields)
            .setColor(39129);
    };

    private processGoal = async (goal: Play) => {
        const embed = await this.createGoalEmbed(goal);
        await this.thread?.send({ embeds: [embed] });
    };

    private processGoals = async (goals: Play[]) => {
        for (const goal of goals) {
            await this.processGoal(goal);
        }
    };

    private processPenalty = async (penalty: Play) => {
        const penaltyEmbed = await this.createPenaltyEmbed(penalty);
        await this?.thread?.send({ embeds: [penaltyEmbed] });
    };

    private sendPeriodUpdate = async (periodDescriptor: PeriodDescriptor, descriptionStr: string) => {
        const scoreEmbed = await this.createScoreEmbed();
        const periodStartString = `${periodToStr(
            periodDescriptor.number || 1,
            periodDescriptor.periodType || "REG"
        )} period has ${descriptionStr}`;
        await this?.thread?.send({
            content: periodStartString,
            embeds: [scoreEmbed],
        });
    }

    private processClockEvents = async (clockEvents: Play[]) => {
        const { periodDescriptor } = await this.getFeed();
        if (!periodDescriptor) {
            return;
        }
        const periodStarts = _.any(clockEvents, (play) => play.typeCode == EventTypeCode.periodStart);
        const periodEnds = _.any(clockEvents, (play) => play.typeCode == EventTypeCode.periodEnd);
        const gameEnds = _.any(clockEvents, (play) => play.typeCode == EventTypeCode.gameEnd);

        // did a period start
        periodStarts && await this.sendPeriodUpdate(periodDescriptor, "started");
        // did a period end
        periodEnds && await this.sendPeriodUpdate(periodDescriptor, "ended");
        // did the game end
        gameEnds && await this.EndGame();
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
