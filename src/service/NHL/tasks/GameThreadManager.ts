import { EmbedBuilder } from "@discordjs/builders";
import { format, utcToZonedTime } from "date-fns-tz";
import { TextChannel, ThreadChannel } from "discord.js";
import { CronJob, SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler";
import { contains } from "underscore";
import { Colors, Config, Environment } from "../../../utils/constants";
import { GameAnnouncementEmbedBuilder } from "../../../utils/EmbedFormatters";
import { GameState } from "../../../utils/enums";
import { ApiDateString, isGameOver, relativeDateString } from "../../../utils/helpers";
import { Logger } from "../../../utils/Logger";
import { API } from "../API";
import { Game } from "../models/DaySchedule";
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
    private teamId: string = Environment.KRAKEN_TEAM_ID;
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
    private tryCreateKrakenGameDayThread = async () => {
        Logger.info("Checking for kraken game today (stopping existing checkers)...");

        // stop existing existing checkers
        this.StopExistingCheckers();

        const games = await API.Schedule.GetDailySchedule();
        const krakenGames = games?.filter((game) => game.homeTeam.id == this.teamId || game.awayTeam.id == this.teamId);
        if (krakenGames.length > 0) {
            const game = krakenGames[0];
            this.gameId = game.id;
            const { awayTeam, homeTeam, startTimeUTC, id, gameState } = game;

            // if the game is over
            if (isGameOver(gameState)) {
                Logger.info("Game over, stopping/skipping pregame checker...");
                this.StopExistingCheckers();
                return;
            }
            Logger.info(`KRAKEN GAME TODAY: ${id}, (${awayTeam.abbrev} at ${homeTeam.abbrev}) @ ${startTimeUTC}`);

            // Create game day embed
            const threadTitle = generateThreadTitle(game);

            // check for existing game day thread (in case we had an oopsies)
            const { threads } = await this.channel.threads.fetch();
            this.thread = threads.filter((thread) => thread.name == threadTitle).first();

            // create thread if it doesn't exist
            if (!this.thread) {
                // announce in thread when the game starts
                const relativeDate = relativeDateString(startTimeUTC);
                const startDateZoned = utcToZonedTime(startTimeUTC, Config.TIME_ZONE);
                const gameStartTimeString = format(startDateZoned, Config.BODY_DATE_FORMAT);
                const team = awayTeam.id == this.teamId ? awayTeam : homeTeam;
                const { commonName } = team;
                const title = `${commonName.default} game today!`;
                const gameStartEmbed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(`Game start: ${gameStartTimeString} (${relativeDate})\n${game.venue.default}`)
                    .setColor(Colors.KRAKEN_EMBED);
                // TODO - add more game details (game story?)
                const message = await this.channel.send({ embeds: [gameStartEmbed] });
                // TODO - this might be fun when next season split-squads happen
                // the thread title is the game thread private key, essentially
                this.thread = await this.channel.threads.create({
                    name: threadTitle,
                    reason: "Creating Kraken Game Day Thread",
                    startMessage: message,
                });

                Logger.info(`CREATED THREAD: ${this.thread.id}`);
            }

            Logger.info(`USING THREAD: ${this.thread.id}, starting pregame checker...`);
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
            Logger.info("No kraken game today. Will check again tomorrow at 9:00");
            this.StopExistingCheckers();
        }
    };

    /**
     * Initializes the GameThreadManager
     * Checks for a kraken game today
     */
    public async initialize() {
        // check if the game is on today and create / attach to a thread if it is
        await this?.tryCreateKrakenGameDayThread();

        // then, start the daily checker (for the next games)
        const dailyCheckerTask = new CronJob(
            {
                cronExpression: every_morning,
                timezone: Config.TIME_ZONE,
            },
            new Task("daily kraken game day thread checker", this.tryCreateKrakenGameDayThread),
            {
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
        this.channel = channel;
    }

    /**
     * Checks for pregame status and starts the live game checker if the game has started (game feed manager)
     */
    private checkForGameStart = async () => {
        if (!this.gameId || !this.thread) {
            Logger.warn("No game id or thread set, , skipping pregame checker...");
            this.StopExistingCheckers();
            return;
        }
        //check if the game has started yet
        const game = await API.Games.GetBoxScore(this.gameId);
        const { gameState, gameDate, startTimeUTC } = game;
        Logger.debug("Pregame Check: " + this.gameId + " - state:" + gameState + ", time:" + gameDate);

        if (contains(startedStates, gameState)) {
            // yuh the game is starting (or has started)
            // log everything because this shit is exhausting
            const { awayTeam, homeTeam } = game;
            Logger.info(
                `PREGAME STARTED FOR ID: ${this.gameId}, (${awayTeam.abbrev} at ${homeTeam.abbrev}) @ ${gameDate}`
            );
            const feed = await API.Games.GetPlays(this.gameId);
            this.gameFeedManager = new GameFeedManager(this.thread, feed);
            // check if the game start is in the past or future (don't re-announce)
            if (new Date(startTimeUTC) > new Date()) {
                const embed = await GameAnnouncementEmbedBuilder(this.gameId);
                await this?.thread?.send({ embeds: [embed] });
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
}

const generateThreadTitle = (game: Game) => {
    const { awayTeam, homeTeam, startTimeUTC } = game;
    const teamSegment = `${awayTeam.abbrev} @ ${homeTeam.abbrev}`;
    const date = utcToZonedTime(startTimeUTC, Config.TIME_ZONE);
    const dateStr = ApiDateString(date);
    return `${teamSegment} - ${dateStr}`;
};

export default GameThreadManager;
