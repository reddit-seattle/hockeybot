import { Client, MessageEmbed, TextChannel, ThreadChannel } from "discord.js";
import { schedule, ScheduledTask, ScheduleOptions } from "node-cron";
import { chain, contains, filter, max, sortBy } from "underscore";
import { API } from "../service/API";
import { ChannelIds, GameStates, Kraken, Strings } from "../utils/constants";
import { CreateGameDayThreadEmbed, CreateGoalEmbed } from "../utils/EmbedFormatters";

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
    GameStates.ALMOST_FINAL, // finalizing
    GameStates.FINAL,    // legit final
    GameStates.GAME_OVER // last period has ended
]

const isOver = (gameState: string) => {
    return contains(gameEndStates, gameState);
}

//return a scheduled task that checks every 10 seconds and announces goals for {gamePk} in {channel}
export const StartGoalChecker = (channel: ThreadChannel | TextChannel, gamePk: string) => {
    let wasIntermission = false;
    let lastGoalAt: Date;
    return schedule(EVERY_TEN_SECONDS, async () => {

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
            const newGoals = chain(allPlays)
                .filter(play => contains(scoringPlays, play.about.eventId) && play.about.dateTime > lastGoalAt)
                .sortBy(play => play.about.dateTime)
                .value();
            if (newGoals) {
                lastGoalAt = newGoals?.[newGoals.length-1]?.about?.dateTime ?? lastGoalAt;
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
            const { away, home } = linescore.teams;
            channel.send(`FINAL - ${away.team.name}: ${away.goals}, ${home.team.name}: ${home.goals}`);
            endCurrentTask();
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
