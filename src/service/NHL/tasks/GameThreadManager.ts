import { EmbedBuilder } from "@discordjs/builders";
import { format, utcToZonedTime } from "date-fns-tz";
import { TextChannel, ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";
import { SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler";
import { Colors, Config, Environment, STARTED_STATES, ThreadManagerState } from "../../../utils/constants";
import { GameAnnouncementEmbedBuilder } from "../../../utils/EmbedFormatters";
import { EmojiCache } from "../../../utils/EmojiCache";
import { GameState } from "../../../utils/enums";
import { ApiDateString, isGameOfficiallyOver, relativeDateString } from "../../../utils/helpers";
import { Logger } from "../../../utils/Logger";
import { API } from "../API";
import { GameFeedManager } from "./GameFeedManager";

const PREGAME_CHECKER_ID = "pregame_checker";

/**
 * Manages a single game's thread lifecycle:
 * 1. Create/find thread
 * 2. Check for game start
 * 3. Manage state transitions
 * 4. Cleanup after game ends
 */
class GameThreadManager {
    private channel: TextChannel;
    private gameId: string;
    private thread?: ThreadChannel;
    private scheduler: ToadScheduler = new ToadScheduler();
    private gameFeedManager?: GameFeedManager;
    private onComplete?: () => void;
    private state: ThreadManagerState = ThreadManagerState.INITIALIZED;

    /**
     * Creates a new GameThreadManager for a specific game
     * @param channel - Channel to create the thread in
     * @param gameId - Game ID to track
     * @param onComplete - Optional callback when game is officially completed
     */
    constructor(
        channel: TextChannel,
        gameId: string,
        onComplete?: () => void
    ) {
        this.channel = channel;
        this.gameId = gameId;
        this.onComplete = onComplete;
    }

    /**
     * Initializes the thread manager
     * - Creates thread if needed
     * - Starts pregame checker
     */
    public async initialize(): Promise<void> {
        try {
            const boxScore = await API.Games.GetBoxScore(this.gameId);
            const { gameState } = boxScore;

            // Don't start new threads for games that are already over
            if (isGameOfficiallyOver(gameState)) {
                Logger.info(`Game ${this.gameId} is already over, skipping thread creation`);
                this.processStateChange(ThreadManagerState.COMPLETED);
                return;
            }

            // Create/get thread (pass boxScore to avoid duplicate API call)
            await this.createOrFindGameThread(boxScore);

            // Thread must exist to proceed
            if (!this.thread) {
                throw new Error(`Failed to create thread for game ${this.gameId}`);
            }

            // If game is already live, start tracking events immediately
            if (STARTED_STATES.includes(gameState as GameState)) {
                Logger.info(`Game ${this.gameId} is already in progress (${gameState}), starting event tracking immediately`);
                await this.startGameTracking();
            } else {
                // Otherwise start pregame checker
                this.startPregameChecker();
                this.processStateChange(ThreadManagerState.PREGAME);
            }
        } catch (error) {
            this.handleError("Failed to initialize thread", error);
        }
    }

    /**
     * Creates a new thread for the game or finds an existing one
     */
    private async createOrFindGameThread(boxScore: any): Promise<void> {
        const threadTitle = this.generateThreadTitle(boxScore);

        // Check for existing thread with this name
        const { threads } = await this.channel.threads.fetch();
        this.thread = threads.filter((thread) => thread.name === threadTitle).first();

        // If thread exists, we're done
        if (this.thread) {
            Logger.info(`Found existing thread for game ${this.gameId}: ${this.thread.id}`);
            return;
        }

        // Create thread with game announcement
        const gameAnnounceEmbed = await this.createGameAnnouncement(boxScore);
        const message = await this.channel.send({ embeds: [gameAnnounceEmbed] });

        this.thread = await this.channel.threads.create({
            name: threadTitle,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
            reason: "Creating Game Day Thread",
            startMessage: message,
        });

        Logger.info(`Created new thread for game ${this.gameId}: ${this.thread.id}`);
    }

    /**
     * Creates the game announcement embed
     */
    private async createGameAnnouncement(boxScore: any): Promise<EmbedBuilder> {
        const { awayTeam, homeTeam, startTimeUTC, venue } = boxScore;

        // Format date/time
        const relativeDate = relativeDateString(startTimeUTC);
        const startDateZoned = utcToZonedTime(startTimeUTC, Config.TIME_ZONE);
        const gameStartTimeString = format(startDateZoned, Config.BODY_DATE_FORMAT);

        // Get team emojis

        const homeEmoji = EmojiCache.getTeamEmoji(homeTeam.abbrev);
        const awayEmoji = EmojiCache.getTeamEmoji(awayTeam.abbrev);

        // Check if this is our favorite team's game
        const favoriteTeamId = Environment.HOCKEYBOT_TEAM_ID;
        const favoriteTeamName = Environment.HOCKEYBOT_TEAM_NAME;
        let title: string;
        let embedColor: number = 0x0099ff; // Default color

        // If either team matches our favorite team ID, use special title
        if (favoriteTeamId &&
            (homeTeam.id.toString() === favoriteTeamId ||
                awayTeam.id.toString() === favoriteTeamId)) {
            // Add emoji to favorite team title
            const ourTeamEmoji = homeTeam.id.toString() === favoriteTeamId ? homeEmoji : awayEmoji;
            title = ourTeamEmoji ? `${ourTeamEmoji} ${favoriteTeamName} game today!` : `${favoriteTeamName} game today!`;
            embedColor = Colors.KRAKEN_EMBED;
        } else {
            const awayDisplay = awayEmoji ? `${awayEmoji} ${awayTeam.commonName.default}` : awayTeam.commonName.default;
            const homeDisplay = homeEmoji ? `${homeTeam.commonName.default} ${homeEmoji}` : homeTeam.commonName.default;
            title = `${awayDisplay} vs ${homeDisplay}`;
        }

        // Create embed
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(`Game start: ${gameStartTimeString} (${relativeDate})\n${venue.default}`)
            .setColor(embedColor);
    }

    // Starts the pregame checker
    private startPregameChecker(): void {
        const pregameCheckerTask = new SimpleIntervalJob(
            { minutes: 5, runImmediately: true },
            new Task(`pregame checker [${this.gameId}]`, this.checkForGameStart),
            { id: PREGAME_CHECKER_ID, preventOverrun: true }
        );

        this.scheduler.addSimpleIntervalJob(pregameCheckerTask);
        Logger.info(`Started pregame checker for game ${this.gameId}`);
    }

    /**
     * Checks if the game has started and starts game feed manager if so
     */
    private checkForGameStart = async (): Promise<void> => {
        if (!this.thread) {
            this.handleError("Thread unavailable during pregame check", new Error("Thread not found"));
            return;
        }

        try {
            // Get latest game state
            const game = await API.Games.GetBoxScore(this.gameId);
            const { gameState } = game;

            Logger.debug(`Pregame check: ${this.gameId} - state: ${gameState}`);

            // Check if game has started
            if (STARTED_STATES.includes(gameState as GameState)) {
                Logger.info(`Game ${this.gameId} has started (state: ${gameState})`);
                this.stopPregameChecker();
                await this.startGameTracking();
            }
        } catch (error) {
            this.handleError(`Error checking pregame status for game ${this.gameId}`, error);
        }
    };

    private async startGameTracking(): Promise<void> {
        if (!this.thread) {
            this.handleError("Thread unavailable when starting game tracking", new Error("Thread not found"));
            return;
        }
        try {
            // Get game feed data
            const feed = await API.Games.GetPlays(this.gameId);

            // Post game start announcement
            const embed = await GameAnnouncementEmbedBuilder(this.gameId);
            await this.thread.send({ embeds: [embed] });

            // Create feed manager with completion callback
            this.gameFeedManager = new GameFeedManager(this.thread, feed, () => {
                Logger.info(`Game ${this.gameId} fully complete, notifying thread manager`);
                this.processStateChange(ThreadManagerState.COMPLETED);
            });

            this.processStateChange(ThreadManagerState.LIVE);
            Logger.info(`Started game tracking for game ${this.gameId}`);
        } catch (error) {
            this.handleError(`Error starting game tracking for game ${this.gameId}`, error);
        }
    }

    private stopPregameChecker(): void {
        if (this.scheduler.existsById(PREGAME_CHECKER_ID)) {
            this.scheduler.stopById(PREGAME_CHECKER_ID);
            Logger.info(`Stopped pregame checker for game ${this.gameId}`);
        }
    }

    // Allows for custom handling/logging of state transitions
    private processStateChange(newState: ThreadManagerState): void {
        const oldState = this.state;
        this.state = newState;
        if (oldState !== newState) {
            Logger.debug(`Game ${this.gameId} state changed: ${oldState} -> ${newState}`);
        }

        // If transitioning to COMPLETED, notify parent
        if (newState === ThreadManagerState.COMPLETED) {
            this.notifyComplete();
        }
    }

    private handleError(message: string, error: any): void {
        Logger.error(`${message}:`, error);
        this.processStateChange(ThreadManagerState.ERROR);
    }

    private notifyComplete(): void {
        if (this.onComplete) {
            this.onComplete();
        }
    }

    public stop(): void {
        this.stopPregameChecker();
        this.gameFeedManager?.Stop();
        this.scheduler.stop();
        Logger.info(`Stopped thread manager for game ${this.gameId}`);

        // Only notify completion if not already in COMPLETED state
        if (this.state !== ThreadManagerState.COMPLETED) {
            this.processStateChange(ThreadManagerState.COMPLETED);
        }
    }

    // Generates thread title for the game, used to track existing threads
    private generateThreadTitle(boxScore: any): string {
        const { awayTeam, homeTeam, startTimeUTC } = boxScore;
        const teamSegment = `${awayTeam.abbrev} @ ${homeTeam.abbrev}`;
        const date = utcToZonedTime(startTimeUTC, Config.TIME_ZONE);
        const dateStr = ApiDateString(date);
        return `${teamSegment} - ${dateStr}`;
    }
}

export default GameThreadManager;
