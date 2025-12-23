import { TextChannel } from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { CronJob, Task, ToadScheduler } from "toad-scheduler";
import { Logger } from "../../../utils/Logger";
import { Config } from "../../../utils/constants";
import { API } from "../API";
import { Game } from "../models/ScorebarResponse";
import { PWHLGameThreadManager } from "./PWHLGameThreadManager";

const MANUAL_GAMES_FILE = "./data/pwhl-manual-games.json";

/**
 * Manages PWHL game threads
 */
export class PWHLGameScheduleMonitor {
	private scheduler: ToadScheduler = new ToadScheduler();
	private channel: TextChannel;
	private favoriteTeamId: string | null;
	private manualGameIds: Set<string> = new Set();
	private activeManagers: Map<string, PWHLGameThreadManager> = new Map();
	private isRunning: boolean = false;

	/**
	 * Creates a new schedule monitor
	 * @param channel Discord channel to post threads in
	 * @param favoriteTeamId automatically track games for this team daily (PWHL team ID)
	 */
	constructor(channel: TextChannel, favoriteTeamId: string | null = null) {
		this.channel = channel;
		this.favoriteTeamId = favoriteTeamId;
		if (!favoriteTeamId) {
			Logger.warn("[PWHL] No team ID specified. Only manually added games will be tracked.");
		}

		// Load persisted manual games
		this.loadManualGamesFromDisk();
	}

	private loadManualGamesFromDisk(): void {
		try {
			if (existsSync(MANUAL_GAMES_FILE)) {
				const data = readFileSync(MANUAL_GAMES_FILE, "utf8");
				const gameIds: string[] = JSON.parse(data);
				this.manualGameIds = new Set(gameIds);
				if (gameIds.length > 0) {
					Logger.info(`[PWHL] Loaded ${gameIds.length} manually tracked games from disk`);
				}
			}
		} catch (error) {
			Logger.error("[PWHL] Failed to load manual games from disk:", error);
		}
	}

	private saveManualGamesToDisk(): void {
		try {
			const gameIds = Array.from(this.manualGameIds);
			const dir = MANUAL_GAMES_FILE.substring(0, MANUAL_GAMES_FILE.lastIndexOf("/"));

			// Create data directory if it doesn't exist
			if (!existsSync(dir)) {
				const fs = require("fs");
				fs.mkdirSync(dir, { recursive: true });
			}

			writeFileSync(MANUAL_GAMES_FILE, JSON.stringify(gameIds, null, 2));
			Logger.debug(`[PWHL] Saved ${gameIds.length} manually tracked games to disk`);
		} catch (error) {
			Logger.error("[PWHL] Failed to save manual games to disk:", error);
		}
	}

	public initialize(): void {
		if (this.isRunning) {
			Logger.warn("[PWHL] Game schedule monitor already running");
			return;
		}
		this.checkTodaysSchedule();
		const dailyCheckerTask = new CronJob(
			{ cronExpression: Config.GAME_CHECKER_CRON, timezone: Config.TIME_ZONE },
			new Task("PWHL daily schedule checker", this.checkTodaysSchedule),
			{ preventOverrun: true },
		);
		this.scheduler.addCronJob(dailyCheckerTask);
		this.isRunning = true;
		Logger.info(`[PWHL] Game schedule monitor initialized for team: ${this.favoriteTeamId || "none"}`);
	}

	/**
	 * Manually adds a game ID to track
	 * @returns true if game was added, false if already tracking
	 */
	public async addGameToTrack(gameId: string): Promise<boolean> {
		// Check if already tracking
		if (this.activeManagers.has(gameId)) {
			Logger.info(`[PWHL] Game ${gameId} is already being tracked`);
			return false;
		}

		if (this.manualGameIds.has(gameId)) {
			Logger.info(`[PWHL] Game ${gameId} is already in manual tracking list`);
			return false;
		}

		// Add to manual tracking and persist
		this.manualGameIds.add(gameId);
		this.saveManualGamesToDisk();
		Logger.info(`[PWHL] Added game ID ${gameId} to tracking list`);

		// Create thread manager using same logic as processGame
		await this.createThreadManager(gameId);

		return true;
	}

	/**
	 * Checks today's schedule for games matching criteria
	 * Creates a thread manager for each matching game not already tracked
	 */
	private checkTodaysSchedule = async (): Promise<void> => {
		try {
			Logger.info("[PWHL] Checking today's PWHL schedule...");

			// Get today's games from scorebar (has live status)
			const allGames = await API.Schedule.GetScorebar(1, 1);
			const todayStr = new Date().toISOString().split("T")[0];
			const games = allGames.filter((game) => game.GameDateISO8601.startsWith(todayStr));

			if (!games || games.length === 0) {
				Logger.info("[PWHL] No games scheduled for today");
				return;
			}

			let gamesToTrack: Game[] = [];

			// Check for games we care about
			if (this.favoriteTeamId) {
				const teamGames = games.filter(
					(game) => game.HomeID === this.favoriteTeamId || game.VisitorID === this.favoriteTeamId,
				);
				gamesToTrack.push(...teamGames);
				if (teamGames.length > 0) {
					Logger.info(`[PWHL] Found ${teamGames.length} games for team ID ${this.favoriteTeamId}`);
				}
			}

			// Check for manually added game IDs
			if (this.manualGameIds.size > 0) {
				const manualGames = games.filter((game) => this.manualGameIds.has(game.ID));
				gamesToTrack.push(...manualGames);
				if (manualGames.length > 0) {
					Logger.info(`[PWHL] Found ${manualGames.length} manually tracked games`);
				}
			}

			// Remove duplicates
			const uniqueGames = Array.from(new Map(gamesToTrack.map((game) => [game.ID, game])).values());

			if (uniqueGames.length === 0) {
				Logger.info("[PWHL] No games to track today");
				return;
			}

			// Process each game
			for (const game of uniqueGames) {
				await this.createThreadManager(game.ID);
			}
		} catch (error) {
			Logger.error("[PWHL] Error checking today's schedule:", error);
		}
	};

	private async createThreadManager(gameId: string): Promise<void> {
		// Skip if we're already tracking this game
		if (this.activeManagers.has(gameId)) {
			Logger.debug(`[PWHL] Already tracking game ${gameId}`);
			return;
		}
		try {
			const threadManager = new PWHLGameThreadManager(
				this.channel,
				gameId,
				// Closing callback
				() => {
					Logger.info(`[PWHL] Game ${gameId} complete - removing thread manager`);
					this.activeManagers.delete(gameId);
					this.manualGameIds.delete(gameId);
					this.saveManualGamesToDisk();
				},
			);
			await threadManager.initialize();
			this.activeManagers.set(gameId, threadManager);
			Logger.info(`[PWHL] Now tracking game ${gameId}`);
		} catch (error) {
			Logger.error(`[PWHL] Error creating thread manager for game ${gameId}:`, error);
			this.manualGameIds.delete(gameId);
			this.saveManualGamesToDisk(); // Persist removal
		}
	}

	/**
	 * Stops all active thread managers
	 */
	public stopAll(): void {
		if (!this.isRunning) {
			return;
		}
		Logger.info(`[PWHL] Stopping all ${this.activeManagers.size} active game trackers`);
		this.activeManagers.forEach((manager, gameId) => {
			Logger.info(`[PWHL] Stopping thread manager for game ${gameId}`);
			manager.stop();
		});

		this.activeManagers.clear();
		this.scheduler.stop();
		this.isRunning = false;

		Logger.info("[PWHL] Game schedule monitor stopped");
	}
}
