import { ThreadChannel } from "discord.js";
import { Config } from "../../../utils/constants";
import { GameFeedEmbedFormatter } from "../../../utils/EmbedFormatters";
import { delay } from "../../../utils/helpers";
import { Logger } from "../../../utils/Logger";
import { API } from "../API";
import { Play, PlayByPlayResponse } from "../models/PlayByPlayResponse";

export class GameReplayManager {
	private thread: ThreadChannel;
	private gameId: string;
	private feed?: PlayByPlayResponse;
	private embedFormatter?: GameFeedEmbedFormatter;
	private isRunning: boolean = false;
	private messageMap: Map<string, any> = new Map();
	private delayMs: number = 100;

	constructor(thread: ThreadChannel, gameId: string) {
		this.thread = thread;
		this.gameId = gameId;
	}

	public async start(): Promise<void> {
		if (this.isRunning) {
			Logger.warn(`Replay already running for game ${this.gameId}`);
			return;
		}

		this.isRunning = true;
		Logger.info(`Starting game replay for ${this.gameId}`);

		try {
			// Fetch the complete game data
			await this.loadGameData();
			if (!this.feed) {
				throw new Error("Failed to load game feed");
			}
			await this.replayPlays();
			await this.postGameEnd();
			Logger.info(`Game replay completed for ${this.gameId}`);
		} catch (error) {
			Logger.error(`Error during game replay for ${this.gameId}:`, error);
			await this.thread.send(`Error during replay: ${error}`);
		} finally {
			this.isRunning = false;
		}
	}

	public stop(): void {
		this.isRunning = false;
		Logger.info(`Stopping game replay for ${this.gameId}`);
	}

	private async loadGameData(): Promise<void> {
		Logger.info(`Loading game data for ${this.gameId}`);
		const feed = await API.Games.GetPlays(this.gameId);
		this.feed = feed;
		this.embedFormatter = new GameFeedEmbedFormatter(feed);
	}

	private async replayPlays(): Promise<void> {
		if (!this.feed) return;

		const { plays } = this.feed;
		const playsToReplay = plays.filter((play) => Config.TRACKED_NHL_EVENT_TYPES.includes(play.typeCode));
		Logger.info(`Replaying ${playsToReplay.length} plays...`);

		for (const play of playsToReplay) {
			if (!this.isRunning) {
				Logger.info("Replay stopped by user");
				break;
			}
			await this.processPlay(play);
			await delay(this.delayMs);
		}
	}

	private async processPlay(play: Play): Promise<void> {
		try {
			const embed = this.embedFormatter?.createEmbedForPlay(play);

			if (embed) {
				const { eventId } = play;
				const message = await this.thread.send({ embeds: [embed] });
				this.messageMap.set(eventId, { message, play });
			}
		} catch (error) {
			Logger.error(`Error processing play ${play.eventId}:`, error);
		}
	}

	private async postGameEnd(): Promise<void> {
		if (!this.feed || !this.embedFormatter) return;

		const gameEndEmbed = this.embedFormatter.createGameEndEmbed();
		await this.thread.send({ embeds: [gameEndEmbed] });

		// Try to get story data for the game
		try {
			Logger.info(`Fetching post-game story data...`);
			const story = await API.Games.GetStory(this.gameId);

			if (story?.summary?.threeStars?.length > 0) {
				const enhancedEmbed = this.embedFormatter.createStoryEmbed(story);
				await this.thread.send({ embeds: [enhancedEmbed] });
				Logger.info(`Posted three stars and game stats`);
			}
		} catch (error) {
			Logger.warn(`Could not fetch story data (game may be too old):`, error);
		}
	}

	public getFeed(): PlayByPlayResponse | undefined {
		return this.feed;
	}
}
