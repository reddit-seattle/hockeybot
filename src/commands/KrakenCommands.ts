import { Client, TextChannel, ThreadChannel } from "discord.js";
import { schedule, ScheduledTask, ScheduleOptions } from "node-cron";
import { API } from "../service/API";
import { ChannelIds, GameStates, Kraken, Strings } from "../utils/constants";
import { CreateGameDayThreadEmbed } from "../utils/EmbedFormatters";

const dailyCronMinute = '0';
const dailyCronHour = '9';
const dailyCronString = `${dailyCronMinute} ${dailyCronHour} * * *`

const EVERY_TEN_MINUTES = `*/10 * * * *`;
const EVERY_MINUTE = `* * * * *`;
const EVERY_TEN_SECONDS = `*/10 * * * * *`;

let currentTask: ScheduledTask;

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
    GameStates.FINAL,
    GameStates.FINAL_PENDING,
    GameStates.GAME_OVER,
]

const isOver = (gameState: string) => {
    return gameEndStates.indexOf(gameState) >= 0;
}

//return a scheduled task that checks every 10 seconds and announces goals for {gamePk} in {channel}
export const StartGoalChecker = (channel: ThreadChannel | TextChannel, gamePk: string) => {
    return schedule(EVERY_TEN_SECONDS, async () => {
        const game = await API.Games.GetGameById(gamePk);
        const state = game?.gameData.status.codedGameState;
        if (isOver(state)) {
            endCurrentTask();
        }
        else {

        }
    }, DO_NOT_SCHEDULE)
}

//return a scheduled task that checks every minute for game start
export const GameStartChecker = (channel: ThreadChannel | TextChannel, gamePk: string) => {
    return schedule(EVERY_MINUTE, async () => {
        const game = await API.Games.GetGameById(gamePk);
        const state = game?.gameData.status.codedGameState;
        if (state === GameStates.IN_PROGRESS) {
            const nextTask = StartGoalChecker(channel, gamePk);
            setCurrentTask(nextTask)
        }
        else if (isOver(state)) {
            endCurrentTask();
        }
    }, DO_NOT_SCHEDULE)
}

//return a scheduled task that checks every 10 mins for game preview
export const PregameChecker = (channel: ThreadChannel | TextChannel, gamePk: string) => {
    return schedule(EVERY_TEN_MINUTES, async () => {
        const game = await API.Games.GetGameById(gamePk);
        
        const state = game?.gameData.status.codedGameState;
        if (state === GameStates.PRE_GAME) {
            const nextTask = GameStartChecker(channel, gamePk);
            setCurrentTask(nextTask);
        }
        else if (state === GameStates.IN_PROGRESS) {
            const nextTask = StartGoalChecker(channel, gamePk);
            setCurrentTask(nextTask);
        }
    }, DO_NOT_SCHEDULE)
}

//return a scheduled task that checks for kraken games today, and updates the game day thread.
export const SetupKrakenGameDayChecker = (client: Client) => {
    return schedule(dailyCronString, async () => {
        
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
            setCurrentTask(PregameChecker(gameDayThread!, gamePk));
        }
    });
}
