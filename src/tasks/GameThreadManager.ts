import { schedule, ScheduledTask } from "node-cron";
import { contains } from "underscore";
import { Kraken } from "../utils/constants";
import { API } from "../service/API";
import { ApiDateString, isGameOver, relativeDateString } from "../utils/helpers";
import { TextChannel, ThreadChannel } from "discord.js";
import { EmbedBuilder } from "@discordjs/builders";
import { Game } from "../service/models/responses/DaySchedule";
import { GameState } from "../utils/enums";
import { GameFeedManager } from "./GameFeedManager";

let every_minute = "*/1 * * * *";
let every_morning = "0 0 9 * * *";

const startedStates = [GameState.pregame, GameState.live, GameState.critical];

/**
 * Manages the creation of a game day thread and the live game feed checker
 * TODO write better documentation
 * Owns a task that runs every minute to check for a game start
 * Owns a task that runs every day at 9am to check for a kraken game
 * Owns a game feed manager that runs every 10 seconds to check for game updates
 * Owns a channel to create a thread in
 * Owns a thread to post messages in
 * Owns a game id to check for game updates
 */
class GameThreadManager {
    private channel: TextChannel;
    private gameId?: string;
    private thread?: ThreadChannel;
    private dailyScheduleCheckTask?: ScheduledTask;
    private pregameCheckerTask?: ScheduledTask;
    private gameFeedManager?: GameFeedManager;

    // TODO - this function does too much and has too many side-effects - refactor
    /**
     * Checks for a kraken game today on the schedule and creates a thread if there is one
     * If there's a game, creates a thread and posts an embed in the channel
     * If there's no game, does nothing
     * @returns {Promise<boolean>} - true if there is a kraken game today and the thread is created, false otherwise
     */
    private createKrakenGameDayThread: () => Promise<boolean> = async () => {
        console.log("--------------------------------------------------");
        console.log("Checking for kraken game today...");
        console.log("--------------------------------------------------");
        
        const games = await API.Schedule.GetDailySchedule();
        const krakenGames = games?.filter(
            (game) => game.homeTeam.id == Kraken.TeamId || game.awayTeam.id == Kraken.TeamId
        );
        if (krakenGames.length > 0) {
            const game = krakenGames[0];
            this.gameId = game.id;
            const { awayTeam, homeTeam, startTimeUTC, id } = game;

            console.log("--------------------------------------------------");
            console.log(`KRAKEN GAME TODAY: ${id}, (${awayTeam.abbrev} at ${homeTeam.abbrev}) @ ${startTimeUTC}`);
            console.log("--------------------------------------------------");

            // Create game day embed
            const embed = new EmbedBuilder().setTitle("Kraken Game Day").addFields([
                {
                    name: `${awayTeam.abbrev} at ${homeTeam.abbrev}`,
                    value: game.venue.default,
                },
            ]);
            const threadTitle = generateThreadTitle(game);
            
            // check for existing game day thread (in case we had an oopsies)
            const { threads } = await this.channel.threads.fetch();
            this.thread = threads.filter((thread) => thread.name == threadTitle).first();
            
            // create thread if it doesn't exist
            if (!this.thread) {
                // announce to channel
                const message = await this.channel.send({ embeds: [embed] });
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

                // announce in thread when the game starts
                // TODO - friendly datetime string
                await this.thread.send(`Kraken game scheduled today: ${new Date(startTimeUTC)} (${relativeDateString(startTimeUTC)})`);
            }
            
            console.log("--------------------------------------------------");
            console.log(`USING THREAD: ${this.thread.id}`);
            console.log("--------------------------------------------------");
            
            return true;
        }
        return false;
    };

    /**
     * Initializes the GameThreadManager
     * Checks for a kraken game today
     */
    public async initialize() {
        console.log("--------------------------------------------------");
        console.log("Game THREAD manager initialize...");
        console.log("--------------------------------------------------");
        // check if the game is on today and create a thread if it is
        if (!(await this?.createKrakenGameDayThread())) {
            // if not, start the daily checker
            console.log("--------------------------------------------------");
            console.log("There's no hockey today, starting scheduled task...");
            console.log("--------------------------------------------------");

            this.dailyScheduleCheckTask = schedule(every_morning, this?.createKrakenGameDayThread, {
                scheduled: true,
                timezone: "America/Los_Angeles",
            });
        }
        else {
            this.pregameCheckerTask = schedule(every_minute, this.checkForGameStart, {
                scheduled: true,
                timezone: "America/Los_Angeles",
            });
        }
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

    // #region pregame
    /**
     * Checks for pregame status and starts the live game checker if the game has started (game feed manager)
     */
    private checkForGameStart = async () => {
        // log this
        if (!this.gameId || !this.thread) {
            console.log("--------------------------------------------------");
            console.log("No game id or thread set, , skipping pregame checker...");
            console.log("--------------------------------------------------");
            // TODO - try to restart pregame checker
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
            // spawn a live game feed checker
            this.gameFeedManager = new GameFeedManager(this.thread, this.gameId);
            // check if the game start is in the past or future (don't re-announce)
            if (new Date(startTimeUTC) > new Date()) {
                this.announceGameStartingSoon(startTimeUTC);
            }
            await this?.pregameCheckerTask?.stop();
        }
        if (isGameOver(gameState)) {
            // the game is over
            this?.gameFeedManager?.Stop();
            this?.pregameCheckerTask?.stop();
        }
    };

    private announceGameStartingSoon = async (startTimeUTC: string) => {
        await this?.thread?.send(`Game starting soon: ${relativeDateString(startTimeUTC)}`);
    };

    // #endregion

}

const generateThreadTitle = (game: Game) => {
    const { awayTeam, homeTeam, startTimeUTC } = game;
    const teamSegment = `${awayTeam.abbrev} @ ${homeTeam.abbrev}`;
    const date = new Date(startTimeUTC);
    const dateStr = ApiDateString(date);
    return `${teamSegment} - ${dateStr}`;
};


export default GameThreadManager;
