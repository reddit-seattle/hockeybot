import { ThreadChannel, EmbedBuilder } from "discord.js";
import { ScheduleOptions, ScheduledTask, schedule } from "node-cron";
import { API } from "../service/API";
import { Play, PlayByPlayResponse, RosterPlayer, Team } from "../service/models/responses/PlayByPlayResponse";
import { isGameOver, periodToStr } from "../utils/helpers";
import { EventTypeCode } from "../utils/enums";
import { Kraken } from "../utils/constants";
import { Strings } from "../utils/constants";

export class GameFeedManager {
    private CRON: string = "*/10 * * * * *";

    private taskOptions: ScheduleOptions = { scheduled: true, timezone: "America/Los_Angeles" };

    private task: ScheduledTask;
    private thread: ThreadChannel;
    private gameId: string;
    private feed?: PlayByPlayResponse;

    // TODO - on first load, we probably want to pre-load all "previous" goals and penalties without announcing them
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
        const { gameState, gameDate, awayTeam, homeTeam, periodDescriptor } = game;

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
        // TODO - parse empty details / figure out what to do

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

        // Penalty Description
        const penaltyDescription =
            Strings.PENALTY_STRINGS[descKey as keyof typeof Strings.PENALTY_STRINGS] ?? "Unknown penalty";

        // Penalty Player (and drawn by player if exists)
        let playerString = `${penaltyPlayer?.firstName.default} ${penaltyPlayer?.lastName.default}`;
        if (drawnByPlayer) {
            // , drawn by Jake Guentzel
            playerString += `, drawn by ${drawnByPlayer?.firstName.default} ${drawnByPlayer?.lastName.default}`;
        }
        // committed or served
        let servedByString = committedByPlayerId ? "Committed" : "Served";

        const descHeader = `${excitement ? "## " : ""}`;
        // ## Too many men on the ice - Served by Jake Guentzel(, drawn by whoever)
        const description = `${descHeader}${penaltyDescription} - ${servedByString} by ${playerString}`;
        const { periodDescriptor, clock } = await this.getFeed();
        const { timeRemaining } = clock;
        const timeRemainingString = `${timeRemaining} remaining in the ${periodToStr(
            periodDescriptor.number || 1,
            periodDescriptor.periodType || "REG"
        )} period`;

        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: timeRemainingString })
            .setColor(39129);
    };

    private createGoalEmbed = async (goal: Play) => {
        const { scoringPlayerId, assist1PlayerId, assist2PlayerId } = goal.details ?? {};
        const scorer = this.roster.get(scoringPlayerId ?? "");
        const assist1 = this.roster.get(assist1PlayerId ?? "");
        const assist2 = this.roster.get(assist2PlayerId ?? "");

        const scoringTeam = this.teamsMap.get(goal.details?.eventOwnerTeamId ?? "");

        // TODO - strings for SH/PP/EN goals / etc
        // 'shotType' = wrist, tip-in, snap, slap, poke, backhand, bat, deflected, wrap-around, between-legs, cradle
        // we like the kraken
        const excitement = scoringTeam?.id == Kraken.TeamId;
        const goalString = excitement ? "GOAL!" : "goal";
        let title = `${scoringTeam?.placeName.default} ${scoringTeam?.commonName.default} ${goalString}`;
        if (excitement) {
            title = `${Strings.REDLIGHT_EMBED} ${title} ${Strings.REDLIGHT_EMBED}`;
        }
        const unassisted = !assist1 && !assist2;
        let description = `${excitement ? "## " : ""}${scorer?.firstName.default} ${scorer?.lastName.default} (${
            goal.details?.scoringPlayerTotal
        }) - ${
            Strings.GOAL_TYPE_STRINGS[goal.details?.shotType as keyof typeof Strings.GOAL_TYPE_STRINGS] ??
            goal.details?.shotType ?? "Unknown shot type"
        }`;
        if (unassisted) {
            description += " - Unassisted";
        }

        const assists = [];
        if (assist1) {
            assists.push({
                name: "1st Assist:",
                value: `${assist1?.firstName.default} ${assist1?.lastName.default} (${goal.details?.assist1PlayerTotal})`,
            });
        }
        if (assist2) {
            assists.push({
                name: "2nd Assist:",
                value: `${assist2?.firstName.default} ${assist2?.lastName.default} (${goal.details?.assist2PlayerTotal})`,
            });
        }
        const { awayTeam: away, homeTeam: home } = await this.getFeed();
        return new EmbedBuilder()
            .setTitle(title)
            .setThumbnail(scorer?.headshot ?? "")
            .setDescription(description)
            .addFields([
                ...assists,
                {
                    name: `**${away.commonName.default}**`,
                    value: `Goals: **${away.score}**\nShots: ${away.sog}`,
                    inline: true,
                },
                {
                    name: `**${home.commonName.default}**`,
                    value: `Goals: **${home.score}**\nShots: ${home.sog}`,
                    inline: true,
                },
            ])
            .setColor(39129);
    };

    private processGoal = async (goal: Play) => {
        const embed = await this.createGoalEmbed(goal);
        await this.thread?.send({ embeds: [embed] });
    };

    private processGoals = async (goals: Play[]) => {
        // process goals
        // track new goals and announce
        for (const goal of goals) {
            await this.processGoal(goal);
        }
    };

    private processPenalty = async (penalty: Play) => {
        const penaltyEmbed = await this.createPenaltyEmbed(penalty);
        await this?.thread?.send({ embeds: [penaltyEmbed] });
    };

    private processClockEvents = async (clockEvents: Play[]) => {
        const periodStarts = clockEvents.filter((play) => play.typeCode == EventTypeCode.periodStart);
        const periodEnds = clockEvents.filter((play) => play.typeCode == EventTypeCode.periodEnd);
        const gameEnds = clockEvents.filter((play) => play.typeCode == EventTypeCode.gameEnd);

        const { periodDescriptor } = await this.getFeed();
        // TODO - do we even care whats in these arrays?
        // did a new period start
        for (const periodStart of periodStarts) {
            if (periodDescriptor) {
                const scoreEmbed = await this.createScoreEmbed();
                const periodStartString = `${periodToStr(
                    periodDescriptor.number || 1,
                    periodDescriptor.periodType || "REG"
                )} period has started!`;
                await this?.thread?.send({
                    content: periodStartString,
                    embeds: [scoreEmbed],
                });
            }
        }
        // did a period end
        for (const periodEnd of periodEnds) {
            if (periodDescriptor) {
                const scoreEmbed = await this.createScoreEmbed();
                const periodEndString = `${periodToStr(
                    periodDescriptor.number || 1,
                    periodDescriptor.periodType || "REG"
                )} period has ended!`;
                await this?.thread?.send({
                    content: periodEndString,
                    embeds: [scoreEmbed],
                });
            }
        }
        // did the game end
        for (const gameEnd of gameEnds) {
            // TODO - game end function to add teardown code
            const scoreEmbed = await this.createScoreEmbed();
            await this?.thread?.send({
                content: "Game has ended.",
                embeds: [scoreEmbed],
            });
            await this?.thread?.setArchived(true, "game over").catch(console.error);
            await this.Stop();
        }
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
