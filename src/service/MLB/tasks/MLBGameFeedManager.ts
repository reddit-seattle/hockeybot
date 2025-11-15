import { Mutex } from "async-mutex";
import { Message, ThreadChannel } from "discord.js";
import { Config } from "../../../utils/constants";
import { Logger } from "../../../utils/Logger";
import { MLBGameFeedEmbedFormatter } from "../../../utils/MLBEmbedFormatters";
import { GameFeedResponse, Play } from "../models/GameFeed";
import { API } from "../API";

interface PlayMessageContainer {
    message?: Message;
    play: Play;
}

export class MLBGameFeedManager {
    private thread: ThreadChannel;
    private gameId: string;
    private feed?: GameFeedResponse;
    private embedFormatter?: MLBGameFeedEmbedFormatter;
    private trackedPlays: Map<number, PlayMessageContainer> = new Map();
    private postedPitchingChanges: Set<string> = new Set(); // Track by player ID + inning
    private postedInningEnds: Set<string> = new Set(); // Track by "top/bottom-inning" key
    private pollInterval?: NodeJS.Timeout;
    private onGameComplete?: () => void;
    private gameOver: boolean = false;
    private mutex = new Mutex();
    private static readonly TEN_SECONDS = 10 * 1000;

    constructor(thread: ThreadChannel, feed: GameFeedResponse, onGameComplete?: () => void) {
        this.thread = thread;
        this.gameId = feed.gamePk.toString();
        this.feed = feed;
        this.onGameComplete = onGameComplete;
        this.embedFormatter = new MLBGameFeedEmbedFormatter(feed);

        // Mark existing completed plays as tracked
        this.initializeTrackedPlays(feed);
        this.startTracking();
    }

    // Initialize tracked plays to avoid replaying after restart
    private initializeTrackedPlays(feed: GameFeedResponse): void {
        const notablePlays = feed.liveData.plays.allPlays.filter(Config.doesThisMLBPlayMatter);
        for (const play of notablePlays) {
            this.trackedPlays.set(play.atBatIndex, { message: undefined, play });
        }
        Logger.info(`[MLB] Initialized with ${notablePlays.length} already tracked plays`);
    }

    private startTracking(): void {
        // Poll every 10 seconds during game
        this.pollInterval = setInterval(() => this.checkGameStatus(), MLBGameFeedManager.TEN_SECONDS);
        Logger.info(`[MLB] Starting feed tracking for game ${this.gameId}`);
        this.checkGameStatus();
    }

    private async checkGameStatus(): Promise<void> {
        const release = await this.mutex.acquire();

        try {
            // Fetch latest game data
            this.feed = await API.LiveGames.ById(this.gameId);
            if (!this.feed || !this.embedFormatter) {
                Logger.error(`[MLB] No feed data for game ${this.gameId}`);
                return;
            }
            this.embedFormatter.updateFeed(this.feed);

            const { abstractGameState } = this.feed.gameData.status;
            const allPlays = this.feed.liveData.plays.allPlays;

            // plays that matter
            const notablePlays = allPlays.filter(Config.doesThisMLBPlayMatter);
            // ids of plays that matter
            const notablePlayIds = notablePlays.map((play) => play.atBatIndex);
            // ids of plays we're tracking
            const trackedPlayIds = Array.from(this.trackedPlays.keys());

            // Remove plays
            const removedIndices = trackedPlayIds.filter((idx) => !notablePlayIds.includes(idx));
            for (const removedIdx of removedIndices) {
                if (this.trackedPlays.has(removedIdx)) {
                    const removed = this.trackedPlays.get(removedIdx);
                    await removed?.message?.delete();
                    this.trackedPlays.delete(removedIdx);
                    Logger.info(`[MLB] Removed play ${removedIdx}`);
                }
            }

            // Process each completed tracked play
            await Promise.all(
                notablePlays.map(async (play) => {
                    await this.processPlay(play, allPlays);
                }),
            );

            // Check if game is over
            // TODO - enums for MLB game states
            if (abstractGameState === "Final") {
                if (!this.gameOver) {
                    await this.handleGameEnd();
                }
            }
        } catch (error) {
            Logger.error(`[MLB] Error checking game status:`, error);
        } finally {
            release();
        }
    }

    private async processPlay(play: Play, allPlays: Play[]): Promise<void> {
        if (!this.embedFormatter) return;

        const { atBatIndex } = play;
        const { about, result } = play;

        // Check for pitching change
        // TODO - MLB position enums
        const substitution = play.playEvents.find((e) => e.isSubstitution && e.position?.code === "1");
        if (substitution && substitution.player?.id) {
            const pitchingChangeKey = `${substitution.player.id}-${about.inning}-${about.halfInning}`;
            if (!this.postedPitchingChanges.has(pitchingChangeKey)) {
                Logger.debug(`[MLB] New pitching change detected`);
                const embed = this.embedFormatter.createPitchingChangeEmbed(play);
                if (embed) {
                    await this.thread.send({ embeds: [embed] });
                    this.postedPitchingChanges.add(pitchingChangeKey);
                }
            }
        }

        const embed = this.embedFormatter.createPlayEmbed(play);

        if (embed) {
            if (!this.trackedPlays.has(atBatIndex)) {
                const message = await this.thread.send({ embeds: [embed] });
                this.trackedPlays.set(atBatIndex, { message, play });
                Logger.info(`[MLB] New message for play ${atBatIndex} (${result.eventType}): ${message.url}`);
            } else {
                const existing = this.trackedPlays.get(atBatIndex);
                const existingPlay = existing?.play;
                const playChanged =
                    existingPlay &&
                    (existingPlay.result?.description !== play.result?.description ||
                        existingPlay.result?.rbi !== play.result?.rbi ||
                        existingPlay.result?.event !== play.result?.event);

                if (playChanged) {
                    const editedMessage = await existing?.message?.edit({ embeds: [embed] });
                    this.trackedPlays.set(atBatIndex, {
                        message: editedMessage ?? existing?.message,
                        play,
                    });
                    Logger.info(`[MLB] Updated message for play ${atBatIndex} (${result.eventType})`);
                }
            }
        }

        // Check for inning end
        const nextPlay = allPlays.find((p) => p.atBatIndex === atBatIndex + 1);
        const isInningEnd =
            (about.endTime && play.count.outs === 3) || (nextPlay && nextPlay.about.halfInning !== about.halfInning);

        if (isInningEnd) {
            const inningEndKey = `${about.halfInning}-${about.inning}`;

            if (!this.postedInningEnds.has(inningEndKey)) {
                const inningEndEmbed = this.embedFormatter.createInningEndEmbed(play);
                if (inningEndEmbed) {
                    await this.thread.send({ embeds: [inningEndEmbed] });
                    this.postedInningEnds.add(inningEndKey);
                }
            }
        }
    }

    private async handleGameEnd(): Promise<void> {
        this.gameOver = true;
        Logger.info(`[MLB] Game ${this.gameId} has ended`);

        if (!this.embedFormatter) return;

        const gameEndEmbed = this.embedFormatter.createGameEndEmbed();
        if (gameEndEmbed) {
            await this.thread.send({ embeds: [gameEndEmbed] });
        }
        this.Stop();
        if (this.onGameComplete) {
            this.onGameComplete();
        }
    }

    public Stop(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = undefined;
        }
        Logger.info(`[MLB] Stopped tracking game ${this.gameId}`);
    }
}
