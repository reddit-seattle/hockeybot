import { ThreadChannel, EmbedBuilder } from "discord.js";
import { ScheduleOptions, ScheduledTask, schedule } from "node-cron";
import { API } from "../service/API";
import { Details, Play, RosterPlayer, Team } from "../service/models/responses/PlayByPlayResponse";
import { isGameOver, periodToStr } from "../utils/helpers";
import { PeriodDescriptor } from "../service/models/responses/DaySchedule";
import { EventTypeCode } from "../utils/enums";

export class GameFeedManager {
    private CRON: string = "*/10 * * * * *";

    private taskOptions: ScheduleOptions = { scheduled: true, timezone: "America/Los_Angeles" };

    private task: ScheduledTask;
    private thread: ThreadChannel;
    private gameId: string;

    // TODO - on first load, we probably want to pre-load all "previous" goals and penalties without announcing them
    // In case we start in the middle of a game (crash / reboot / etc) we don't want to announce all the goals / penalties again
    private goalEventIds: Set<string> = new Set<string>();
    private penaltyEventIds: Set<string> = new Set<string>();
    private periodEventIds: Set<string> = new Set<string>();
    private teamsMap: Map<string, Team> = new Map<string, Team>();
    private roster: Map<string, RosterPlayer> = new Map<string, RosterPlayer>();

    constructor(thread: ThreadChannel, gameId: string, taskOptions?: ScheduleOptions, cron?: string) {
        this.thread = thread;
        this.gameId = gameId;
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
        // TODO - probably don't need this and can remove or perform logic in constructor
        if (!this.gameId) {
            console.log("--------------------------------------------------");
            console.log("No game id set, skipping live game checker...");
            console.log("--------------------------------------------------");
            // TODO - try to restart live game checker
            return;
        }

        const game = await API.Games.GetBoxScore(this.gameId);
        const { gameState, gameDate, awayTeam, homeTeam, periodDescriptor } = game;

        // Check for game end state on box score
        if (isGameOver(gameState)) {
            await this.thread?.send("The game is over!");
            await this.thread?.send(
                `Score: ${awayTeam.commonName.default} ${awayTeam.score}, ${homeTeam.commonName.default} ${homeTeam.score}`
            );
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
        const feed = await API.Games.GetPlays(this.gameId);
        console.dir(feed);
        const { awayTeam: away, homeTeam: home, plays } = feed;

        // todo - buckets
        const goals = [];
        const penalties = [];
        const clockEvents = [];

        // parse plays once into buckets
        for (const play of plays) {
            // TODO - move eventId-already-processed logic to a here
            const { typeCode } = play;
            if (typeCode == EventTypeCode.goal) {
                goals.push(play);
                // TODO - add to API (typecode 509 = penalty)
            } else if (typeCode == EventTypeCode.penalty) {
                penalties.push(play);
                // TODO - add to API (typecode 520 = period start, 521 = period end, 524 = game end)
            } else if (
                typeCode == EventTypeCode.periodStart ||
                typeCode == EventTypeCode.periodEnd ||
                typeCode == EventTypeCode.gameEnd
            ) {
                clockEvents.push(play);
            }
        }

        this.processClockEvents(clockEvents, periodDescriptor, away, home);
        this.processGoals(goals, away, home);
        // process penalties
        for (const penalty of penalties) {
            await this.processPenalty(penalty);
        }
    };

    private createScoreString = (details: Details, away: Team, home: Team) => {
        const { awayScore, homeScore, awaySOG, homeSOG } = details;
        const homeScoreString = `${home.commonName.default} ${homeScore ?? home?.score ?? 0} (${homeSOG ?? home?.sog ?? 0})`;
        const awayScoreString = `${away.commonName.default} ${awayScore ?? away?.score ?? 0} (${awaySOG ?? away?.sog ?? 0})`;
        return `Score: ${awayScoreString}, ${homeScoreString}`;

    }

    private processGoal = async (goal: Play) => {
        const { eventId } = goal;
        if (!this.goalEventIds.has(eventId)) {
            this.goalEventIds.add(eventId);
            if (goal.details) {
                const { scoringPlayerId, assist1PlayerId, assist2PlayerId, goalieInNetId } = goal.details;
                const scorer = this.roster.get(scoringPlayerId ?? "");
                const assist1 = this.roster.get(assist1PlayerId ?? "");
                const assist2 = this.roster.get(assist2PlayerId ?? "");
                const goalie = this.roster.get(goalieInNetId ?? "");

                const scoringTeam = this.teamsMap.get(goal.details?.eventOwnerTeamId ?? "");

                // TODO - krakenize if we scored
                // TODO - fancy embed
                // TODO - strings for SH/PP/EN goals / etc
                let response = `${scoringTeam?.placeName.default} ${scoringTeam?.commonName.default} goal scored by ${scorer?.firstName.default} ${scorer?.lastName.default} (${goal.details?.scoringPlayerTotal})`;
                let assistsString = `Unassisted.`;
                if (assist1) {
                    assistsString = `Assists: ${assist1?.firstName.default} ${assist1?.lastName.default} (${goal.details?.assist1PlayerTotal})`;
                    if (assist2) {
                        assistsString += `, ${assist2?.firstName.default} ${assist2?.lastName.default} (${goal.details?.assist2PlayerTotal})`;
                    }
                }
                response += `\n${assistsString}`;
                await this?.thread?.send(response);
            }
            return true;
        }
        return false;
    };

    private processGoals = async (goals: Play[], away: Team, home: Team) => {
        // process goals
        let newGoal = false;
        let awayScore, homeScore, awaySOG, homeSOG;
        // track new goals and announce
        for (const goal of goals) {
            newGoal = newGoal || (await this.processGoal(goal));
            const { details } = goal;
            if (details) {
                awayScore = details.awayScore;
                homeScore = details.homeScore;
                awaySOG = details.awaySOG;
                homeSOG = details.homeSOG;
            }
        }
        // if we have at least one new goal, announce the score
        if (newGoal) {
            const homeScoreString = `${home.commonName.default} ${homeScore ?? home?.score ?? 0} (${homeSOG ?? home?.sog ?? 0})`
            const awayScoreString = `${away.commonName.default} ${awayScore ?? away?.score ?? 0} (${awaySOG ?? away?.sog ?? 0})`
            await this?.thread?.send(
                `Score: ${awayScoreString}, ${homeScoreString}`
            );
        }
    };

    private processPenalty = async (penalty: Play) => {
        const { eventId, details } = penalty;
        if (!this.penaltyEventIds.has(eventId)) {
            this.penaltyEventIds.add(eventId);
            if (details) {
                const { committedByPlayerId, drawnByPlayerId, eventOwnerTeamId, descKey, typeCode } = details;
                const penaltyPlayer = this.roster.get(committedByPlayerId ?? "");
                const drawnByPlayer = this.roster.get(drawnByPlayerId ?? "");
                const penaltyTeam = this.teamsMap.get(eventOwnerTeamId ?? "");
                // announce penalty
                // TODO - fancy embed
                // SEA penalty, tripping (MIN) by Alex Iafallo on Jake Guentzel
                let penaltyString = `${penaltyTeam?.abbrev} penalty, ${descKey} (${typeCode}) by ${penaltyPlayer?.firstName.default} ${penaltyPlayer?.lastName.default}`;
                if (drawnByPlayer) {
                    penaltyString += ` on ${drawnByPlayer?.firstName.default} ${drawnByPlayer?.lastName.default}`;
                }
                await this?.thread?.send(penaltyString);
            }
            return true;
        }
        return false;
    };

    private processClockEvents = async (
        clockEvents: Play[],
        periodDescriptor: PeriodDescriptor,
        away: Team,
        home: Team
    ) => {
        const periodStarts = clockEvents.filter((play) => play.typeCode == EventTypeCode.periodStart);
        const periodEnds = clockEvents.filter((play) => play.typeCode == EventTypeCode.periodEnd);
        const gameEnds = clockEvents.filter((play) => play.typeCode == EventTypeCode.gameEnd);

        // did a new period start
        for (const periodStart of periodStarts) {
            const { eventId } = periodStart;
            if (!this.periodEventIds.has(eventId)) {
                this.periodEventIds.add(eventId);
                if (periodStart?.details && periodDescriptor) {
                    const scoreString = this.createScoreString(periodStart?.details, away, home);
                    const periodStartString = `${periodToStr(periodDescriptor.number || 1, periodDescriptor.periodType || "REG")} period has started!`
                    await this?.thread?.send(
                        `${periodStartString}\n${scoreString}`
                    );
                }
            }
        }
        // did a period end
        for (const periodEnd of periodEnds) {
            const { eventId } = periodEnd;
            if (!this.periodEventIds.has(eventId)) {
                this.periodEventIds.add(eventId);
                if (periodEnd?.details && periodDescriptor) {
                    const scoreString = this.createScoreString(periodEnd?.details, away, home);
                    const periodEndString = `${periodToStr(periodDescriptor.number || 1, periodDescriptor.periodType || "REG")} period has ended!`
                    await this?.thread?.send(
                        `${periodEndString}\n${scoreString}`
                    );
                }
            }
        }

        // did the game end
        for (const gameEnd of gameEnds) {
            const { eventId } = gameEnd;
            if (!this.periodEventIds.has(eventId)) {
                this.periodEventIds.add(eventId);
                // TODO - game end function to add teardown code
                await this?.thread?.send("The game has ended!");
                if (gameEnd?.details) {
                    const scoreString = this.createScoreString(gameEnd?.details, away, home);
                    await this?.thread?.send(`Final ${scoreString}`);
                }
                await this?.thread?.setArchived(true, "game over").catch(console.error);
                await this.Stop();
            }
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
