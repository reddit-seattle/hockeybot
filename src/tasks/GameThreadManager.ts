import { EmbedBuilder } from "@discordjs/builders";
import { format, utcToZonedTime } from "date-fns-tz";
import { TextChannel, ThreadChannel } from "discord.js";
import { CronJob, SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler";
import { contains } from "underscore";
import { API } from "../service/API";
import { Game } from "../service/models/responses/DaySchedule";
import { Config, Kraken } from "../utils/constants";
import { GameState } from "../utils/enums";
import { ApiDateString, isGameOver, relativeDateString } from "../utils/helpers";
import { GameFeedManager } from "./GameFeedManager";

let every_morning = "0 0 9 * * *";

const PREGAME_CHECKER_ID = "pregame_checker";

const startedStates = [GameState.pregame, GameState.live, GameState.critical];

/** BIG list of TODOs
 *
 * * TODO - add game story to game start embed
 * * TODO - shootout tracker?
 * * TODO - playoffs? (among other places)
 */

/**
 * Manages the creation of a game day thread and the live game feed checker
 * TODO write better documentation
 * Owns a task that runs every minute to check for a game start
 * Starts a task that runs every day at 9am to check for a kraken game
 * Owns a game feed manager that runs every 10 seconds to check for game updates
 * channel to create a thread in
 * thread to post messages in
 * game id to check for game updates
 */
class GameThreadManager {
    private channel: TextChannel;
    private gameId?: string;
    private thread?: ThreadChannel;
    private scheduler: ToadScheduler = new ToadScheduler();
    private gameFeedManager?: GameFeedManager;

    private StopExistingCheckers = () => {
        if (this.scheduler.existsById(PREGAME_CHECKER_ID)) {
            this.scheduler.stopById(PREGAME_CHECKER_ID);
        }
        this?.gameFeedManager?.Stop();
    };

    // TODO - this function does too much and has too many side-effects - refactor
    /**
     * Checks for a kraken game today on the schedule and creates a thread if there is one
     * If there's a game, creates a thread and posts an embed in the channel
     * If there's no game, does nothing
     * @returns {Promise<boolean>} - true if there is a kraken game today and the thread is created, false otherwise
     */
    private createKrakenGameDayThread = async () => {
        console.log("--------------------------------------------------");
        console.log("Checking for kraken game today (stopping existing checkers)...");
        console.log("--------------------------------------------------");

        // stop existing existing checkers
        this.StopExistingCheckers();

        const games = await API.Schedule.GetDailySchedule();
        const krakenGames = games?.filter(
            (game) => game.homeTeam.id == Kraken.TeamId || game.awayTeam.id == Kraken.TeamId
        );
        if (krakenGames.length > 0) {
            const game = krakenGames[0];
            this.gameId = game.id;
            const { awayTeam, homeTeam, startTimeUTC, id, gameState } = game;

            // if the game is over
            if (isGameOver(gameState)) {
                console.log("--------------------------------------------------");
                console.log("Game over, skipping pregame checker...");
                console.log("--------------------------------------------------");
                this.StopExistingCheckers();
                return;
            }

            console.log("--------------------------------------------------");
            console.log(`KRAKEN GAME TODAY: ${id}, (${awayTeam.abbrev} at ${homeTeam.abbrev}) @ ${startTimeUTC}`);
            console.log("--------------------------------------------------");

            // Create game day embed
            const threadTitle = generateThreadTitle(game);

            // check for existing game day thread (in case we had an oopsies)
            const { threads } = await this.channel.threads.fetch();
            this.thread = threads.filter((thread) => thread.name == threadTitle).first();

            // create thread if it doesn't exist
            if (!this.thread) {
                // announce to channel
                // announce in thread when the game starts
                const relativeDate = relativeDateString(startTimeUTC);
                const startDateZoned = utcToZonedTime(startTimeUTC, Config.TIME_ZONE);
                const gameStartTimeString = format(startDateZoned, Config.BODY_DATE_FORMAT);
                const title = `Kraken game today!`;
                const gameStartEmbed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(`Game start: ${gameStartTimeString} (${relativeDate})\n${game.venue.default}`)
                    .setTimestamp(startDateZoned);
                // TODO - add more game details (game story?)
                const message = await this.channel.send({ embeds: [gameStartEmbed] });
                // create thread (title is imperative)
                // TODO - this might be fun when next season split-squads happen
                this.thread = await this.channel.threads.create({
                    name: threadTitle,
                    reason: "Creating Kraken Game Day Thread",
                    startMessage: message,
                });

                console.log("--------------------------------------------------");
                console.log(`CREATED THREAD: ${this.thread.id}`);
                console.log("--------------------------------------------------");
            }

            console.log("--------------------------------------------------");
            console.log(`USING THREAD: ${this.thread.id}`);
            console.log("--------------------------------------------------");

            // Start the pregame checker
            console.log("--------------------------------------------------");
            console.log("There's hockey today, starting pregame task...");
            console.log("--------------------------------------------------");
            // checks for game start every 5 minutes (and immediately)
            const pregameCheckerTask = new SimpleIntervalJob(
                {
                    minutes: 5,
                    runImmediately: true,
                },
                new Task("pregame checker", this.checkForGameStart),
                {
                    id: PREGAME_CHECKER_ID,
                    preventOverrun: true,
                }
            );
            this.scheduler.addSimpleIntervalJob(pregameCheckerTask);
        } else {
            console.log("--------------------------------------------------");
            console.log("No kraken game today. Will check again tomorrow at 9:00");
            console.log("--------------------------------------------------");
            this.StopExistingCheckers();
        }
    };

    /**
     * Initializes the GameThreadManager
     * Checks for a kraken game today
     */
    public async initialize() {
        console.log("--------------------------------------------------");
        console.log("Game THREAD manager initialize...");
        console.log("--------------------------------------------------");
        // check if the game is on today and create / attach to a thread if it is
        await this?.createKrakenGameDayThread();

        // then, start the daily checker (for the next games)
        const dailyCheckerTask = new CronJob(
            {
                cronExpression: every_morning,
                timezone: Config.TIME_ZONE,
            },
            new Task("daily kraken game day thread checker", this.createKrakenGameDayThread),
            {
                // TODO - may need to be false, depending if old task cleans up correctly
                preventOverrun: true,
            }
        );
        this.scheduler.addCronJob(dailyCheckerTask);
    }

    /**
     * Creates a new GameThreadManager for a specific channel
     * Will create child game feed managers
     * Owns a task that runs every day at 9am to check for a kraken game
     * @param channel - the channel to create the message and thread in
     */
    constructor(channel: TextChannel) {
        console.log("--------------------------------------------------");
        console.log("Game THREAD manager constructor...");
        console.log("--------------------------------------------------");
        this.channel = channel;
    }

    /**
     * Checks for pregame status and starts the live game checker if the game has started (game feed manager)
     */
    private checkForGameStart = async () => {
        if (!this.gameId || !this.thread) {
            console.log("--------------------------------------------------");
            console.log("No game id or thread set, , skipping pregame checker...");
            console.log("--------------------------------------------------");
            this.StopExistingCheckers();
            return;
        }
        console.log("--------------------------------------------------");
        console.log("Checking for game start...");
        console.log("--------------------------------------------------");
        //check if the game has started yet
        const game = await API.Games.GetBoxScore(this.gameId);
        const { gameState, gameDate, startTimeUTC } = game;

        console.log("--------------------------------------------------");
        console.log("Game " + this.gameId + ", state:" + gameState + ", time:" + gameDate);
        console.log("--------------------------------------------------");

        if (contains(startedStates, gameState)) {
            // yuh the game is starting (or has started)
            // log everything because this shit is exhausting
            const { awayTeam, homeTeam } = game;
            console.log("--------------------------------------------------");
            console.log(
                `PREGAME STARTED FOR ID: ${this.gameId}, (${awayTeam.abbrev} at ${homeTeam.abbrev}) @ ${gameDate}`
            );
            console.log("--------------------------------------------------");
            // spawn a live game feed checker... that should end itself
            const feed = await API.Games.GetPlays(this.gameId);
            this.gameFeedManager = new GameFeedManager(this.thread, feed);
            // check if the game start is in the past or future (don't re-announce)
            if (new Date(startTimeUTC) > new Date()) {
                this.announceGameStartingSoon(startTimeUTC);
            }
            // stop pregame checker
            if (this.scheduler.existsById(PREGAME_CHECKER_ID)) {
                await this.scheduler.stopById(PREGAME_CHECKER_ID);
            }
        }
        if (isGameOver(gameState)) {
            this.StopExistingCheckers();
        }
    };

    private announceGameStartingSoon = async (startTimeUTC: string) => {
        await this?.thread?.send(`Game starting soon: ${relativeDateString(startTimeUTC)}`);
    };
}

const generateThreadTitle = (game: Game) => {
    const { awayTeam, homeTeam, startTimeUTC } = game;
    const teamSegment = `${awayTeam.abbrev} @ ${homeTeam.abbrev}`;
    const date = new Date(startTimeUTC);
    const dateStr = ApiDateString(date);
    return `${teamSegment} - ${dateStr}`;
};

export default GameThreadManager;
