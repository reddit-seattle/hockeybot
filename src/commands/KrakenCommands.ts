import { zonedTimeToUtc } from "date-fns-tz";
import { Client, Message, TextChannel, ThreadChannel } from "discord.js";
import { schedule, ScheduledTask, ScheduleOptions } from "node-cron";
import { contains } from "underscore";
import { Command } from "../models/Command";
import { API } from "../service/API";
import { GameFeedResponse } from "../service/models/responses/GameFeed";
import { ChannelIds, Environment, GameStates, Kraken, Strings } from "../utils/constants";
import { CreateGameDayThreadEmbed, CreateGameResultsEmbed, CreateGoalEmbed } from "../utils/EmbedFormatters";

const killSwitchVar = 'killGameChecker';
const dailyCronMinute = 0;
const dailyCronHour = 9;
const dailyCronString = `${dailyCronMinute} ${dailyCronHour} * * *`
const EVERY_THIRTY_MINUTES = Environment.DEBUG ? `*/1 * * * *` : `*/30 * * * *`;
const EVERY_MINUTE = `* * * * *`;
const EVERY_TEN_SECONDS = `*/10 * * * * *`;
let currentTask: ScheduledTask;

//#region IDEAS
/**
 * Make game day thread only start during pregame?
 * Determine if we can run the initial scheduled task at the start (when seabot boots up)
 * and THEN start the timer for the next day.
 * Double-check timers to ensure we're doing this right
 * New thread in the channel per game? or one thread for all game-day stuff
 * Better logging to channel about intermissions / events
 */
//#endregion

//#region  utility functions etc
const DO_NOT_SCHEDULE: ScheduleOptions = {
    scheduled: false,
    timezone: "America/Los_Angeles"
};

const endCurrentTask = () => {
    currentTask?.stop();
}

const setCurrentTask = (nextTask: ScheduledTask) => {
    endCurrentTask();
    nextTask?.start();
    currentTask = nextTask;
}

const gameEndStates: string[] = [
    GameStates.ALMOST_FINAL, // finalizing
    GameStates.FINAL,    // legit final
    GameStates.GAME_OVER // last period has ended
]

const gameProgressStates: string[] = [
    GameStates.IN_PROGRESS,
    GameStates.CRITICAL
]

const isOver = (gameState: string) => {
    return contains(gameEndStates, gameState);
}
const isInProgress = (gameState: string) => {
    return contains(gameProgressStates, gameState);
}
//#endregion

//return a scheduled task that checks every 10 seconds and announces goals for {gamePk} in {channel}
const StartGoalChecker = (channel: ThreadChannel | TextChannel, gamePk: string) => {
    let wasIntermission = false;
    let lastGoalAt: Date = new Date();
    channel.send('Game Starting!');
    return schedule(EVERY_TEN_SECONDS, async () => {
        checkForKillSwitch(channel);
        console.log('Checking for goals / intermissions / etc');
        const feed = await API.Games.GetGameById(gamePk);
        const { linescore } = feed.liveData;
        const { currentPeriodTimeRemaining } = linescore;
        const { inIntermission, intermissionTimeRemaining } = linescore.intermissionInfo;
        const gameState = feed?.gameData?.status?.codedGameState;

        // don't check scores or updates if we're in intermission
        if (inIntermission) {
            //if now intermission, but wasn't before
            if (!wasIntermission) {
                channel.send(`End of the ${linescore.currentPeriodOrdinal} period.`);
                wasIntermission = true;
            }
            const mins = Math.floor(intermissionTimeRemaining / 60);
            const secs = intermissionTimeRemaining % 60;
            console.log(`${mins}:${secs} remaining in the ${linescore.currentPeriodOrdinal} intermission.`);
        }
        else if (contains([
            GameStates.IN_PROGRESS, // general in progress
            GameStates.CRITICAL // nearing end of period with low goal differential (?)
        ], gameState)) {
            // if first update back from intermission
            if (wasIntermission) {
                channel.send(`${linescore.currentPeriodOrdinal} period starting!`);
                wasIntermission = false;
            }
            // check goals
            const { plays } = feed.liveData;
            const { allPlays, scoringPlays } = plays;

            // Get all goals from scoringPlays.
            const allGoals: GameFeedResponse.AllPlay[] = [];
            scoringPlays.forEach((event: number) => {allGoals.push(allPlays[event])});
            // TODO - figure out how to handle disallowed goals (toronto vs montreal from 9/28 or 9/27 as an example)
            const newGoals = allGoals.filter(play =>  new Date(play.about.dateTime) > lastGoalAt);

            //testing something else
            if (Environment.DEBUG){
                console.log("Scoring plays:");
                console.dir(scoringPlays);
                console.log("All goals:");
                console.dir(allGoals);
                console.log("New goals:");
                console.dir(newGoals);
            }

            if (newGoals?.[0]) {
                lastGoalAt = new Date(newGoals?.[newGoals.length-1]?.about?.dateTime ?? lastGoalAt);
                newGoals.forEach(goal => {
                    //announce goal
                    channel.send({
                        embeds: [
                            CreateGoalEmbed(goal, feed.gameData.teams)
                        ]
                    })
                });
            }
            console.log(`${currentPeriodTimeRemaining} remaining in the ${linescore.currentPeriodOrdinal} period.`);
        }
        else if (isOver(gameState)) {
            // End the game and stop this thing if the game is final
            const gameResultEmbed = await CreateGameResultsEmbed(feed);
            channel.send({ embeds:[ gameResultEmbed ]})
            endCurrentTask();
        }
    }, DO_NOT_SCHEDULE)
}

//return a scheduled task that checks every minute for game start
//pre-game starts 30 minutes before puck drop (based on a very hearty sample size of 1)
const GameStartChecker = (channel: ThreadChannel | TextChannel, gamePk: string) => {
    return schedule(EVERY_MINUTE, async () => {
        console.log('Checking for game start');
        const game = await API.Games.GetGameById(gamePk);
        console.dir(game);
        const state = game?.gameData.status.codedGameState;
        console.log('Game state: ' + state);
        if (isInProgress(state)) {
            const nextTask = StartGoalChecker(channel, gamePk);
            setCurrentTask(nextTask)
        }
        else if (isOver(state)) {
            endCurrentTask();
        }
    }, DO_NOT_SCHEDULE)
}

//return a scheduled task that checks every 30 mins for pregame
const PregameChecker = (channel: ThreadChannel | TextChannel, gamePk: string) => {
    return schedule(EVERY_THIRTY_MINUTES, async () => {
        checkForKillSwitch(channel);
        const game = await API.Games.GetGameById(gamePk);
        const state = game?.gameData.status.codedGameState;
        
        if(Environment.DEBUG) {
            console.dir(game);
            console.log('Checking for game in pre-game state');
            console.log('Game State: ' + state);
        }

        if (state === GameStates.PRE_GAME) {
            channel.send("Game starting soon - pregame has started.");
            const nextTask = GameStartChecker(channel, gamePk);
            setCurrentTask(nextTask);
        }
        else if (isInProgress(state)) {
            const nextTask = StartGoalChecker(channel, gamePk);
            setCurrentTask(nextTask);
        }
    }, DO_NOT_SCHEDULE)
}

//return a scheduled task that checks for kraken games today, and updates the game day thread.
export const SetupKrakenGameDayChecker = (client: Client) => {
    const today = new Date();
    const today_PST = zonedTimeToUtc(today, 'America/Los_Angeles');
    const hour = today_PST.getHours();
    const minute = today_PST.getMinutes();
    const beforeCronCheck = hour <= dailyCronHour && minute < dailyCronMinute;

    if(Environment.DEBUG) {
        console.log(`Today: ${today}`);
        console.log(`Today (PST): ${today_PST}`);
        console.log(`Hour: ${hour}, Minute: ${minute}`);
        console.log(`CronTime: ${dailyCronHour}:${dailyCronMinute}`);
    }

    if (!beforeCronCheck) {
        console.log('Missed the CRON today, or restarted since. Checking for games.');
        CheckForTodaysGames(client);
    }

    return schedule(dailyCronString, () => {
        console.log(`Scheduling CRON scheduled task for ${dailyCronString}`);
        CheckForTodaysGames(client);
    });
    
}

const CheckForTodaysGames = async (client: Client) => {
    console.log('Starting to check for todays games');
    const schedule = await API.Schedule.GetTeamSchedule(Kraken.TeamId);
    if (schedule?.[0]) {
        //Get game content
        const game = schedule[0];
        const { gamePk } = game;
        const gameContent = await API.Games.GetGameContent(gamePk);
        //Announce game in the channel.
        const gameDayPost = CreateGameDayThreadEmbed(game, gameContent?.editorial?.preview);
        //Check for game day thread if it exists
        const krakenChannel = client.channels.cache.get(ChannelIds.KRAKEN);
        
        //TODO: Maybe we just make a new thread for each game?
        //TODO: find a better way to persist the ID of the gameDayThread (env config possibly)
        let gameDayThread = (krakenChannel as TextChannel)?.threads.cache.find(ch => ch.name == Strings.KRAKEN_GAMEDAY_THREAD_TITLE)

        // post in gameday thread if it exists, or the kraken channel
        const toSend = (gameDayThread ?? krakenChannel) as TextChannel;
        const startMessage = await toSend?.send({ embeds: [gameDayPost] });

        // if it's in the kraken channel (aka no gameday thread) - create a new thread.
        if (!gameDayThread) {
            gameDayThread = await (krakenChannel as TextChannel).threads.create({
                startMessage,
                name: Strings.KRAKEN_GAMEDAY_THREAD_TITLE,
                reason: 'Creating new Kraken Game Day Thread',
                autoArchiveDuration: 4320
            });
        }

        // start checking goals in gameDayThread
        setCurrentTask(PregameChecker(gameDayThread, gamePk));
    }
}

export const KillGameCheckerCommand: Command = {
    description: 'stop checking for kraken game updates',
    name: 'stop_kraken_updates',
    help: 'stop_kraken_updates',
    adminOnly: true,
    execute: (message: Message) => {
        process.env[killSwitchVar] = 'true';
        message.channel.send('Set killswitch for game update checker.');
    }
}

const checkForKillSwitch = (channel: ThreadChannel | TextChannel) => {
    if(process.env[killSwitchVar])
    {
        endCurrentTask();
        delete process.env[killSwitchVar];
        channel.send('Game updates stopped.');
    }
}