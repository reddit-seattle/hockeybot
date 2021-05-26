
import { ScheduledTask, schedule } from "node-cron";
import { each, filter, reduce } from "underscore";
import { API } from "../service/API";
import { GameState } from "../service/models/GameState";
import { GameDiffResponse } from "../service/models/responses/GameDiff";
import { Schedule } from "../service/models/responses/Schedule";
export const DAILY_GAMES_CRON = '0 0 9 * * *'; // every day at 9:00
export const PREGAME_CHECK_CRON = '0 */15 * * * *' // every 15 minutes
export const GAME_START_CRON = '0 */1 * * * *'  // every 1 minute
export const GAME_UPDATE_CRON = '*/10 * * * * *' // every 10 seconds
export interface CronDictionary {
    [gamePk: string]: ScheduledTask
}
export module CronHelper {
    export let SCHEDULED: CronDictionary = {}; // games being checked for pre-game
    export let PREGAME: CronDictionary = {}; // games in pre-game, waiting for start
    export let GAMES_IN_PROGRESS: CronDictionary = {}; // games in progress

    export const Initialize = (filterExpression?: (game: Schedule.Game) => boolean, getGamesNow?: boolean) => {
        SCHEDULED = {};
        GetDailyGames(filterExpression).start();
        if(getGamesNow) {
            GetAndStoreTodaysGames(filterExpression);
        }

    }
}

const GetAndStoreTodaysGames: (filterExpression?: (game: Schedule.Game) => boolean) => void = async (filterExpression) => {
    CronHelper.SCHEDULED = {};
    CronHelper.PREGAME = {};
    CronHelper.GAMES_IN_PROGRESS = {};
    console.log(`${new Date()}: [GetAndStoreTodaysGames] Getting daily games`);
    const allGames = await API.Schedule.GetSchedule();
    console.log(`${new Date()}: [GetAndStoreTodaysGames] ${allGames.length} games found`);
    const filtered = filter(allGames, filterExpression);
    console.log(`${new Date()}: [GetAndStoreTodaysGames] ${filtered.length} games left after filtering`);
    // if the game passes the filter
    each(filtered, (game: Schedule.Game) => {
        const { gamePk } = game;
        console.log(`${new Date()}: [GetAndStoreTodaysGames] Game ${gamePk} Checking for pregame`);
        CronHelper.SCHEDULED[gamePk] = CheckPregame(gamePk);
    });
}
// Check for today's games, add them to watch list
export const GetDailyGames: (filterExpression?: (game: Schedule.Game) => boolean) => ScheduledTask = (filterExpression) => {
    return schedule(DAILY_GAMES_CRON, async () => {
        // remove all daily games regardles
        await GetAndStoreTodaysGames(filterExpression);
        
    },
        {
            timezone: "America/Los_Angeles",
            scheduled: false
        });
}

export const CheckPregame: (gamePk: string) => ScheduledTask = (gamePk) => {
    return schedule(PREGAME_CHECK_CRON, async () => {
        console.log(`${new Date()}: [Checkpregame] Game ${gamePk} checking for pre-game`);
        const game = await API.Games.GetGameById(gamePk);
        // if game state is pre-game 
        if (game?.gameData?.status?.codedGameState in [GameState.PRE_GAME]) {
            console.log(`${new Date()}: [CheckPregame] Game ${gamePk} in pre-game, moving to [CheckGameStart]`);
            // Remove the pre-game watcher
            CronHelper.SCHEDULED[gamePk]?.destroy();
            // Move to game start checking.
            CronHelper.PREGAME[gamePk] = CheckGameStart(gamePk);
        } // if it's already in progress, skip right to game updates
        else if (game?.gameData?.status?.codedGameState in [GameState.IN_PROGRESS]) {
            console.log(`${new Date()}: [CheckPregame] Game ${gamePk} in progress(skipped pre-game), moving to [GameUpdate]`);
            // Remove the pre-game watcher
            CronHelper.SCHEDULED[gamePk]?.destroy();
            // Move straight to game updates, include current timestamp for diff
            CronHelper.GAMES_IN_PROGRESS[gamePk] = GameUpdate(gamePk, game?.metaData?.timeStamp);
        }
    },
        {
            timezone: "America/Los_Angeles",
        });
}

export const CheckGameStart: (gamePk: string) => ScheduledTask = (gamePk) => {
    return schedule(GAME_START_CRON, async () => {
        console.log(`${new Date()}: [CheckGameStart] Game ${gamePk} checking for game start`);
        const game = await API.Games.GetGameById(gamePk);
        if (game?.gameData?.status?.codedGameState in [GameState.IN_PROGRESS]) {
            console.log(`${new Date()}: [CheckGameStart] Game ${gamePk} in progress, moving to [GameUpdate]`);
            // Remove the pre-game watcher
            CronHelper.SCHEDULED[gamePk]?.destroy();
            // Move to game start checking.
            CronHelper.PREGAME[gamePk] = GameUpdate(gamePk, game?.metaData?.timeStamp);
        }
    },
        {
            timezone: "America/Los_Angeles",
        });
}

export const GameUpdate: (gamePk: string, timeCode: string) => ScheduledTask = (gamePk, timeCode) => {
    return schedule(GAME_UPDATE_CRON, async () => {
        // get and flatten all diffs (new events since last timecode)
        const diff = await API.Games.GetGameDiff(gamePk, timeCode);
        const allDiffs = reduce(diff,
            (prevDiff: GameDiffResponse.Diff[], currDiff: GameDiffResponse.DiffContainer) =>
                prevDiff.concat(currDiff.diff), [] as GameDiffResponse.Diff[]);

        // Get NEW events (assumption is that a goal is an 'ADD' op)
        const adds = allDiffs.filter(diff => diff.op.toLowerCase() == "add");
        console.log("New 'ADD' ops");
        console.dir(adds);

        // Filter only goal events
        const newGoals = adds.filter(diff => diff?.value?.result?.eventTypeId == "GOAL");
        console.log("'ADD' ops: Goals");
        console.dir(newGoals);

        // Log each goal description (just to see if we're doing this right)
        console.log('GOALS:')
        each(newGoals, (goal: GameDiffResponse.Diff) => {
            console.dir(goal?.value?.result?.description);
            console.dir(goal?.value?.about?.goals);
        });

        // line/boxscore updates
        // NEED - timestamp, current time in period, isIntermission(), which period
        const feed = await API.Games.GetGameById(gamePk);
        timeCode = feed.metaData.timeStamp;
        const { linescore } = feed.liveData;
        const { currentPeriodTimeRemaining } = linescore;
        const { inIntermission, intermissionTimeRemaining } = linescore.intermissionInfo;
        const gameState = feed?.gameData?.status?.codedGameState;

        // for debug info, log time in period or intermission
        if (inIntermission) {
            console.log(`${intermissionTimeRemaining} remaining in the ${linescore.currentPeriodOrdinal} intermission.`)
        }
        else if (gameState in [
            GameState.IN_PROGRESS, // general in progress
            GameState.CRITICAL // nearing end of period with low goal differential (?)
        ]) {
            console.log(`${currentPeriodTimeRemaining} remaining in the ${linescore.currentPeriodOrdinal} period.`);
        }
        else if (gameState in [
            GameState.ALMOST_FINAL, // finalizing
            GameState.FINAL,    // legit final
            GameState.GAME_OVER // last period has ended
        ]) {
            // End the game and stop this thing if the game is final
            console.log(`GAME OVER`);
            const { away, home } = linescore.teams;
            console.log(`${away.team.name}: ${away.goals}, ${home.team.name}: ${home.goals}`);
            CronHelper.GAMES_IN_PROGRESS[gamePk]?.destroy();
        }
    },
        {
            timezone: "America/Los_Angeles",
        });
}