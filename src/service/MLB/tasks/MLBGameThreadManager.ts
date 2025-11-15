import { EmbedBuilder } from "@discordjs/builders";
import { TextChannel, ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";
import { SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler";
import { ApiDateString, relativeDateString, localizedTimeString } from "../../../utils/helpers";
import { Logger } from "../../../utils/Logger";
import { MLBGameAnnouncementEmbedBuilder } from "../../../utils/MLBEmbedFormatters";
import { Colors } from "../../../utils/constants";
import { API } from "../API";
import { GameFeedResponse } from "../models/GameFeed";
import { MLBGameFeedManager } from "./MLBGameFeedManager";

const PREGAME_CHECKER_ID = "mlb_pregame_checker";
const PREGAME_POLLING_MINUTES = 5;

// Manages MLB game thread lifecycle
export class MLBGameThreadManager {
	private channel: TextChannel;
	private gameId: string;
	private thread?: ThreadChannel;
	private scheduler: ToadScheduler = new ToadScheduler();
	private gameFeedManager?: MLBGameFeedManager;
	private onComplete?: () => void;

	constructor(channel: TextChannel, gameId: string, onComplete?: () => void) {
		this.channel = channel;
		this.gameId = gameId;
		this.onComplete = onComplete;
	}

	public async initialize(): Promise<void> {
		try {
			const game = await API.LiveGames.ById(this.gameId);
			const { abstractGameState } = game.gameData.status;

			// Don't start threads for completed games
			if (abstractGameState === "Final") {
				Logger.info(`[MLB] Game ${this.gameId} is already over, skipping`);
				if (this.onComplete) this.onComplete();
				return;
			}

			await this.createOrFindGameThread(game);
			if (!this.thread) {
				throw new Error(`[MLB] Failed to create thread for game ${this.gameId}`);
			}

			// If game is live, start tracking immediately
			if (abstractGameState === "Live") {
				Logger.info(`[MLB] Game ${this.gameId} is already live, starting tracking`);
				await this.startGameTracking();
			} else {
				this.startPregameChecker();
			}
		} catch (error) {
			Logger.error(`[MLB] Failed to initialize game thread ${this.gameId}:`, error);
		}
	}

	private async createOrFindGameThread(game: GameFeedResponse): Promise<void> {
		const threadTitle = this.generateThreadTitle(game);
		const { threads } = await this.channel.threads.fetch();
		this.thread = threads.filter((thread) => thread.name === threadTitle).first();
		if (this.thread) {
			Logger.info(`[MLB] Found existing thread: ${this.thread.id}`);
			return;
		}

		const announceEmbed = await this.createGameAnnouncement(game);
		const message = await this.channel.send({ embeds: [announceEmbed] });
		this.thread = await this.channel.threads.create({
			name: threadTitle,
			autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
			reason: "Creating MLB Game Thread",
			startMessage: message,
		});
		Logger.info(`[MLB] Created thread: ${this.thread.id}`);
	}

	private async createGameAnnouncement(game: GameFeedResponse): Promise<EmbedBuilder> {
		const { teams, datetime, venue } = game.gameData;
		const { away, home } = teams;
		const title = `${away.teamName} @ ${home.teamName}`;
		const gameDateTime = new Date(datetime.dateTime);
		const gameDateTimePT = localizedTimeString(gameDateTime);
		const relativeTime = relativeDateString(gameDateTime);

		const description = `Game Start: ${gameDateTimePT} PT (${relativeTime})\n${venue.name}`;

		return new EmbedBuilder().setTitle(title).setDescription(description).setColor(Colors.MARINERS);
	}

	private startPregameChecker(): void {
		const pregameTask = new SimpleIntervalJob(
			{ minutes: PREGAME_POLLING_MINUTES, runImmediately: true },
			new Task(`MLB pregame checker [${this.gameId}]`, this.checkForGameStart),
			{ id: PREGAME_CHECKER_ID, preventOverrun: true },
		);

		this.scheduler.addSimpleIntervalJob(pregameTask);
		Logger.info(`[MLB] Started pregame checker for game ${this.gameId}`);
	}

	/**
	 * Checks if game has started
	 */
	private checkForGameStart = async () => {
		try {
			const game = await API.LiveGames.ById(this.gameId);
			const { abstractGameState } = game.gameData.status;

			Logger.debug(`MLB pregame check: ${this.gameId} - state: ${abstractGameState}`);

			if (abstractGameState === "Live") {
				Logger.info(`MLB game ${this.gameId} has started`);
				this.stopPregameChecker();
				await this.startGameTracking();
			}
		} catch (error) {
			Logger.error(`Error checking MLB pregame status for ${this.gameId}:`, error);
		}
	};

	private startGameTracking = async () => {
		if (!this.thread) return;

		try {
			const feed = await API.LiveGames.ById(this.gameId);

			// Check if thread already has messages (bot restart scenario)
			const messages = await this.thread.messages.fetch({ limit: 10 });
			const hasAnnouncementAlready = messages.size > 1; // More than just the starter message

			// Only post game start announcement if this is the first time
			if (!hasAnnouncementAlready) {
				const embed = await MLBGameAnnouncementEmbedBuilder(feed);
				await this.thread.send({ embeds: [embed] });
				Logger.info(`[MLB GAME] Posted game start announcement for ${this.gameId}`);
			} else {
				Logger.info(
					`[MLB GAME] Skipping announcement, thread already has ${messages.size} messages (restart scenario)`,
				);
			}

			// Create feed manager
			this.gameFeedManager = new MLBGameFeedManager(this.thread, feed, () => {
				Logger.info(`MLB game ${this.gameId} complete`);
				if (this.onComplete) this.onComplete();
			});

			Logger.info(`Started MLB game tracking for ${this.gameId}`);
		} catch (error) {
			Logger.error(`Error starting MLB game tracking for ${this.gameId}:`, error);
		}
	};

	private stopPregameChecker(): void {
		if (this.scheduler.existsById(PREGAME_CHECKER_ID)) {
			this.scheduler.stopById(PREGAME_CHECKER_ID);
			Logger.info(`Stopped MLB pregame checker for ${this.gameId}`);
		}
	}

	public stop(): void {
		this.stopPregameChecker();
		this.gameFeedManager?.Stop();
		this.scheduler.stop();
		Logger.info(`Stopped MLB thread manager for ${this.gameId}`);
	}

	// Generates thread title based on teams and date (used for finding existing threads)
	private generateThreadTitle(game: GameFeedResponse): string {
		const { teams, datetime } = game.gameData;
		const teamSegment = `${teams.away.abbreviation} @ ${teams.home.abbreviation}`;
		const date = new Date(datetime.dateTime);
		const dateStr = ApiDateString(date);
		return `${teamSegment} - ${dateStr}`;
	}
}

export default MLBGameThreadManager;
