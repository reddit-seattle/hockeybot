import { Message, TextChannel } from "discord.js";
import { CronJob, Task, ToadScheduler } from "toad-scheduler";
import { Logger } from "../../../utils/Logger";
import { Config } from "../../../utils/constants";
import { PlayoffDailySummaryEmbedBuilder } from "../../../utils/PlayoffEmbedFormatters";
import { isPlayoffGame, isPlayoffPeriod } from "../../../utils/PlayoffHelpers";
import { API } from "../API";
import { ApiDateString } from "../../../utils/helpers";
import { Game } from "../models/DaySchedule";
import GameThreadManager from "./NHLGameThreadManager";

/**
 * Manages game threads.
 * In playoffs mode, tracks ALL playoff games and posts a daily summary embed.
 */
export class NHLGameScheduleMonitor {
	private scheduler: ToadScheduler = new ToadScheduler();
	private channel: TextChannel;
	private favoriteTeamId: string | null;
	private activeManagers: Map<string, GameThreadManager> = new Map();
	private isRunning: boolean = false;
	private playoffSummaryMessage: Message | null = null;
	private playoffSummaryDate: string | null = null;

	/**
	 * Creates a new schedule monitor
	 * @param channel Discord channel to post threads in
	 * @param favoriteTeamId automatically track games for this team daily
	 */
	constructor(channel: TextChannel, favoriteTeamId: string | null = null) {
		this.channel = channel;
		this.favoriteTeamId = favoriteTeamId;
		if (!favoriteTeamId) {
			Logger.warn("No team ID specified. Only manually added games will be tracked.");
		}
	}

	/**
	 * Initializes the schedule monitor
	 * - Checks immediately for today's games
	 * - Starts daily cron
	 */
	public initialize(): void {
		if (this.isRunning) {
			Logger.warn("Game schedule monitor already running");
			return;
		}
		this.checkTodaysSchedule();
		const dailyCheckerTask = new CronJob(
			{ cronExpression: Config.GAME_CHECKER_CRON, timezone: Config.TIME_ZONE },
			new Task("daily schedule checker", this.checkTodaysSchedule),
			{ preventOverrun: true },
		);
		this.scheduler.addCronJob(dailyCheckerTask);
		this.isRunning = true;
		Logger.info(`Game schedule monitor initialized for team: ${this.favoriteTeamId || "none"}`);
	}

	/**
	 * Manually adds a game ID to track
	 * @returns true if game was added, false if already tracking
	 */
	public async addGameToTrack(gameId: string): Promise<boolean> {
		// Check if already tracking
		if (this.activeManagers.has(gameId)) {
			Logger.info(`Game ${gameId} is already being tracked`);
			return false;
		}
		Logger.info(`Added game ID ${gameId} to tracking list`);
		await this.createThreadManager(gameId);

		return true;
	}

	/**
	 * Checks today's schedule for games matching criteria.
	 * Auto-detects playoffs mode and tracks all playoff games when active.
	 */
	private checkTodaysSchedule = async (): Promise<void> => {
		try {
			Logger.info("Checking today's NHL schedule...");

			const scheduleResponse = await API.Schedule.GetDailyScheduleResponse();
			const games = scheduleResponse.gameWeek[0]?.games;
			if (!games || games.length === 0) {
				Logger.info("No games scheduled for today");
				return;
			}

			// Auto-detect playoffs mode
			const inPlayoffs = isPlayoffPeriod(scheduleResponse);

			if (inPlayoffs) {
				await this.handlePlayoffSchedule(games);
			} else {
				await this.handleRegularSeasonSchedule(games);
			}
		} catch (error) {
			Logger.error("Error checking today's schedule:", error);
		}
	};

	/**
	 * Playoffs mode: track all playoff games, post daily summary
	 */
	private handlePlayoffSchedule = async (games: Game[]): Promise<void> => {
		const playoffGames = games.filter((game) => isPlayoffGame(game.gameType));

		if (playoffGames.length === 0) {
			Logger.info("No playoff games scheduled for today");
			return;
		}

		Logger.info(`[PLAYOFFS] Found ${playoffGames.length} playoff games today`);

		// Post or update the daily summary embed
		await this.postOrUpdatePlayoffSummary(playoffGames);

		// Create thread managers for each playoff game
		for (const game of playoffGames) {
			await this.createThreadManager(game.id);
		}
	};

	/**
	 * Regular season mode: track only the favorite team's games
	 */
	private handleRegularSeasonSchedule = async (games: Game[]): Promise<void> => {
		let gamesToTrack: Game[] = [];

		if (this.favoriteTeamId) {
			const teamGames = games.filter(
				(game) =>
					`${game.homeTeam.id}` === this.favoriteTeamId || `${game.awayTeam.id}` === this.favoriteTeamId,
			);
			gamesToTrack.push(...teamGames);
			if (teamGames.length > 0) {
				Logger.info(`Found ${teamGames.length} games for team ID ${this.favoriteTeamId}`);
			}
		}

		// Remove duplicates
		const uniqueGames = Array.from(new Map(gamesToTrack.map((game) => [game.id, game])).values());

		if (uniqueGames.length === 0) {
			Logger.info("No games to track today");
			return;
		}

		for (const game of uniqueGames) {
			await this.createThreadManager(game.id);
		}
	};

	/**
	 * Posts or updates the daily playoff summary embed
	 */
	private async postOrUpdatePlayoffSummary(games: Game[]): Promise<void> {
		try {
			const summaryEmbed = await PlayoffDailySummaryEmbedBuilder(games);
			if (!summaryEmbed) {
				Logger.info("[PLAYOFFS] No playoff games to summarize today");
				return;
			}

			const todayStr = ApiDateString(new Date());

			// Reset summary if it's a new calendar day
			if (this.playoffSummaryDate !== todayStr) {
				this.playoffSummaryMessage = null;
				this.playoffSummaryDate = todayStr;
			}

			if (this.playoffSummaryMessage) {
				await this.playoffSummaryMessage.edit({ embeds: [summaryEmbed] });
				Logger.info("[PLAYOFFS] Updated daily summary embed");
			} else {
				this.playoffSummaryMessage = await this.channel.send({ embeds: [summaryEmbed] });
				Logger.info(`[PLAYOFFS] Posted daily summary embed for ${todayStr}`);
			}
		} catch (error) {
			Logger.error("Error posting playoff summary:", error);
		}
	}

	/**
	 * Creates a GameThreadManager for the specified game ID.
	 */
	private async createThreadManager(gameId: string): Promise<void> {
		// Skip if we're already tracking this game
		if (this.activeManagers.has(gameId)) {
			Logger.debug(`Already tracking game ${gameId}`);
			return;
		}
		try {
			const threadManager = new GameThreadManager(
				this.channel,
				gameId,
				// Closing callback
				() => {
					Logger.info(`Game ${gameId} complete - removing thread manager`);
					this.activeManagers.delete(gameId);
				},
			);
			await threadManager.initialize();
			this.activeManagers.set(gameId, threadManager);
			Logger.info(`Now tracking game ${gameId}`);
		} catch (error) {
			Logger.error(`Error creating thread manager for game ${gameId}:`, error);
		}
	}

	/**
	 * Stops all active thread managers
	 */
	public stopAll(): void {
		if (!this.isRunning) {
			return;
		}
		Logger.info(`Stopping all ${this.activeManagers.size} active game trackers`);
		this.activeManagers.forEach((manager, gameId) => {
			Logger.info(`Stopping thread manager for game ${gameId}`);
			manager.stop();
		});

		this.activeManagers.clear();
		this.playoffSummaryMessage = null;
		this.playoffSummaryDate = null;
		this.scheduler.stop();
		this.isRunning = false;

		Logger.info("Game schedule monitor stopped");
	}
}
