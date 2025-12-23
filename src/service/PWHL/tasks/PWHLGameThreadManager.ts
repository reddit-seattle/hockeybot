import { EmbedBuilder } from "@discordjs/builders";
import { format, utcToZonedTime } from "date-fns-tz";
import { TextChannel, ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";
import { SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler";
import { Colors, Config, Environment, ThreadManagerState } from "../../../utils/constants";
import { EmojiCache } from "../../../utils/EmojiCache";
import { ApiDateString, relativeDateString } from "../../../utils/helpers";
import { Logger } from "../../../utils/Logger";
import { PWHLGameStartEmbedBuilder } from "../../../utils/PWHLEmbedFormatters";
import { API } from "../API";
import { GameSummary } from "../models/GameSummaryResponse";
import { Game } from "../models/ScorebarResponse";
import { PWHLGameFeedManager } from "./PWHLGameFeedManager";

const PREGAME_CHECKER_ID = "pwhl_pregame_checker";

// PWHL game states based on GameStatus (numeric field)
// GameStatus values:
// 1 = Pregame (GameStatusString shows game time like "10:00PM")
// 2 = Live/In Progress
// 3 = Final
// 4 = Final/OT
// 5 = Final/SO
const PWHL_PREGAME_STATUS = "1";
const PWHL_LIVE_STATUSES = ["2"]; // Game is live/in progress
const PWHL_FINAL_STATUSES = ["3", "4", "5"]; // Final, Final/OT, Final/SO

export class PWHLGameThreadManager {
	private channel: TextChannel;
	private gameId: string;
	private thread?: ThreadChannel;
	private scheduler: ToadScheduler = new ToadScheduler();
	private gameFeedManager?: PWHLGameFeedManager;
	private onComplete?: () => void;
	private state: ThreadManagerState = ThreadManagerState.INITIALIZED;

	/**
	 * Creates a new PWHLGameThreadManager for a specific game
	 * @param channel - Channel to create the thread in
	 * @param gameId - Game ID to track
	 * @param onComplete - Optional callback when game is officially completed
	 */
	constructor(channel: TextChannel, gameId: string, onComplete?: () => void) {
		this.channel = channel;
		this.gameId = gameId;
		this.onComplete = onComplete;
	}

	public async initialize(): Promise<void> {
		try {
			const scorebarGames = await API.Schedule.GetScorebar(1, 1);
			const game = scorebarGames.find((g) => g.ID === this.gameId);

			if (!game) {
				throw new Error(`Game ${this.gameId} not found`);
			}

			// Don't start new threads for games that are already over
			if (PWHL_FINAL_STATUSES.includes(game.GameStatus)) {
				Logger.info(
					`[PWHL] Game ${this.gameId} is already over (status: ${game.GameStatus}), skipping thread creation`,
				);
				this.processStateChange(ThreadManagerState.COMPLETED);
				return;
			}

			// Create/get thread
			await this.createOrFindGameThread(game);
			if (!this.thread) {
				throw new Error(`Failed to create thread for game ${this.gameId}`);
			}

			// If game is already live, start tracking events immediately
			if (PWHL_LIVE_STATUSES.includes(game.GameStatus)) {
				Logger.info(
					`[PWHL] Game ${this.gameId} is already in progress (status: ${game.GameStatus}, ${game.GameStatusString}), starting event tracking immediately`,
				);
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

	private async createOrFindGameThread(game: Game): Promise<void> {
		const threadTitle = this.generateThreadTitle(game);

		// Check for existing thread with this name
		const { threads } = await this.channel.threads.fetch();
		this.thread = threads.filter((thread) => thread.name === threadTitle).first();

		// If thread exists, we're done
		if (this.thread) {
			Logger.info(`[PWHL] Found existing thread for game ${this.gameId}: ${this.thread.id}`);
			return;
		}

		// Create thread with game announcement
		const gameAnnounceEmbed = await this.createGameAnnouncementEmbed(game);
		const message = await this.channel.send({ embeds: [gameAnnounceEmbed] });

		this.thread = await this.channel.threads.create({
			name: threadTitle,
			autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
			reason: "Creating PWHL Game Day Thread",
			startMessage: message,
		});

		Logger.info(`[PWHL] Created new thread for game ${this.gameId}: ${this.thread.id}`);
	}

	private async createGameAnnouncementEmbed(game: Game): Promise<EmbedBuilder> {
		// Format date/time
		const gameDate = new Date(game.GameDateISO8601);
		const relativeDate = relativeDateString(gameDate.toISOString());
		const startDateZoned = utcToZonedTime(gameDate, Config.TIME_ZONE);
		const gameStartTimeString = format(startDateZoned, Config.BODY_DATE_FORMAT);

		// Get team names
		const homeTeam = game.HomeLongName;
		const awayTeam = game.VisitorLongName;

		// Get team emojis
		const homeEmoji = EmojiCache.getPWHLTeamEmoji(game.HomeCode);
		const awayEmoji = EmojiCache.getPWHLTeamEmoji(game.VisitorCode);

		// Check if this is our favorite team's game
		const favoriteTeamId = Environment.HOCKEYBOT_PWHL_TEAM_ID;
		const favoriteTeamName = Environment.HOCKEYBOT_PWHL_TEAM_NAME;
		let title: string;
		let embedColor: number = 0x0099ff; // Default color

		// If either team matches our favorite team ID
		if (favoriteTeamId && (game.HomeID === favoriteTeamId || game.VisitorID === favoriteTeamId)) {
			// Add emoji to title
			const ourTeamEmoji = game.HomeID === favoriteTeamId ? homeEmoji : awayEmoji;
			title = ourTeamEmoji
				? `${ourTeamEmoji} ${favoriteTeamName} game today!`
				: `${favoriteTeamName} game today!`;
			embedColor = Colors.KRAKEN_EMBED; // Could make this configurable
		} else {
			const awayDisplay = awayEmoji ? `${awayEmoji} ${awayTeam}` : awayTeam;
			const homeDisplay = homeEmoji ? `${homeTeam} ${homeEmoji}` : homeTeam;
			title = `${awayDisplay} vs ${homeDisplay}`;
		}

		// Create preview embed
		const venue = game.venue_name || game.venue_location || "Venue TBA";
		return new EmbedBuilder()
			.setTitle(title)
			.setDescription(`Game start: ${gameStartTimeString} (${relativeDate})\n${venue}`)
			.setColor(embedColor);
	}

	private startPregameChecker(): void {
		const pregameCheckerTask = new SimpleIntervalJob(
			Environment.LOCAL_RUN ? { seconds: 30, runImmediately: true } : { minutes: 5, runImmediately: true },
			new Task(`PWHL pregame checker [${this.gameId}]`, this.checkForGameStart),
			{ id: PREGAME_CHECKER_ID, preventOverrun: true },
		);

		this.scheduler.addSimpleIntervalJob(pregameCheckerTask);
		Logger.info(`[PWHL] Started pregame checker for game ${this.gameId}`);
	}

	private checkForGameStart = async (): Promise<void> => {
		if (!this.thread) {
			this.handleError("Thread unavailable during pregame check", new Error("Thread not found"));
			return;
		}

		try {
			const scorebarGames = await API.Schedule.GetScorebar(1, 1);
			const game = scorebarGames.find((g) => g.ID === this.gameId);

			if (!game) {
				throw new Error(`Game ${this.gameId} not found in scorebar`);
			}

			Logger.debug(
				`[PWHL] Pregame check: ${this.gameId} - status: ${game.GameStatus} (${game.GameStatusString})`,
			);

			if (PWHL_LIVE_STATUSES.includes(game.GameStatus)) {
				Logger.info(
					`[PWHL] Game ${this.gameId} has started (status: ${game.GameStatus}, ${game.GameStatusString})`,
				);
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
			const gameSummary = await API.Games.GetGameSummary(this.gameId);

			// Debug logging
			if (Environment.LOCAL_RUN) {
				Logger.debug(`[PWHL] Game summary structure for ${this.gameId}:`, JSON.stringify(gameSummary, null, 2));
			}

			// Post game start announcement
			const embed = await this.createGameStartEmbed(gameSummary);
			await this.thread.send({ embeds: [embed] });

			this.gameFeedManager = new PWHLGameFeedManager(this.thread, this.gameId, gameSummary, () => {
				Logger.info(`[PWHL] Game ${this.gameId} fully complete, notifying thread manager`);
				this.processStateChange(ThreadManagerState.COMPLETED);
			});
			this.processStateChange(ThreadManagerState.LIVE);
			Logger.info(`[PWHL] Started game tracking for game ${this.gameId}`);
		} catch (error) {
			this.handleError(`Error starting game tracking for game ${this.gameId}`, error);
		}
	}

	private async createGameStartEmbed(gameSummary: GameSummary): Promise<EmbedBuilder> {
		return PWHLGameStartEmbedBuilder(gameSummary);
	}

	private stopPregameChecker(): void {
		if (this.scheduler.existsById(PREGAME_CHECKER_ID)) {
			this.scheduler.stopById(PREGAME_CHECKER_ID);
			Logger.info(`[PWHL] Stopped pregame checker for game ${this.gameId}`);
		}
	}

	private processStateChange(newState: ThreadManagerState): void {
		const oldState = this.state;
		this.state = newState;
		if (oldState !== newState) {
			Logger.debug(`[PWHL] Game ${this.gameId} state changed: ${oldState} -> ${newState}`);
		}
		if (newState === ThreadManagerState.COMPLETED) {
			this.notifyComplete();
		}
	}

	private handleError(message: string, error: any): void {
		Logger.error(`[PWHL] ${message}:`, error);
		this.processStateChange(ThreadManagerState.ERROR);
	}

	private notifyComplete(): void {
		if (this.onComplete) {
			this.onComplete();
		}
	}

	public stop(): void {
		this.stopPregameChecker();
		this.gameFeedManager?.stop();
		this.scheduler.stop();
		Logger.info(`[PWHL] Stopped thread manager for game ${this.gameId}`);
		if (this.state !== ThreadManagerState.COMPLETED) {
			this.processStateChange(ThreadManagerState.COMPLETED);
		}
	}

	// Generates thread title for the game, used to track existing threads
	private generateThreadTitle(game: Game): string {
		const teamSegment = `${game.VisitorCode} @ ${game.HomeCode}`;
		const date = new Date(game.GameDateISO8601);
		const dateStr = ApiDateString(date);
		return `[PWHL] ${teamSegment} - ${dateStr}`;
	}
}
