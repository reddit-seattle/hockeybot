import { TextChannel } from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { CronJob, Task, ToadScheduler } from "toad-scheduler";
import { Logger } from "../../../utils/Logger";
import { Config } from "../../../utils/constants";
import { API } from "../API";
import { Game } from "../models/DaySchedule";
import GameThreadManager from "./NHLGameThreadManager";

const MANUAL_GAMES_FILE = "./data/manual-games.json";

/**
 * Manages game threads
 */
export class NHLGameScheduleMonitor {
	private scheduler: ToadScheduler = new ToadScheduler();
	private channel: TextChannel;
	private favoriteTeamId: string | null;
	private manualGameIds: Set<string> = new Set();
	private activeManagers: Map<string, GameThreadManager> = new Map();
	private isRunning: boolean = false;

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
					Logger.info(`Loaded ${gameIds.length} manually tracked games from disk`);
				}
			}
		} catch (error) {
			Logger.error("Failed to load manual games from disk:", error);
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
			Logger.debug(`Saved ${gameIds.length} manually tracked games to disk`);
		} catch (error) {
			Logger.error("Failed to save manual games to disk:", error);
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

		if (this.manualGameIds.has(gameId)) {
			Logger.info(`Game ${gameId} is already in manual tracking list`);
			return false;
		}

		// Add to manual tracking and persist
		this.manualGameIds.add(gameId);
		this.saveManualGamesToDisk();
		Logger.info(`Added game ID ${gameId} to tracking list`);

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
			Logger.info("Checking today's NHL schedule...");

			// Get today's games
			const games = await API.Schedule.GetDailySchedule();
			if (!games || games.length === 0) {
				Logger.info("No games scheduled for today");
				return;
			}

			let gamesToTrack: Game[] = [];

			// Check for games we care about
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

			// Check for manually added game IDs
			if (this.manualGameIds.size > 0) {
				const manualGames = games.filter((game) => this.manualGameIds.has(game.id));
				gamesToTrack.push(...manualGames);
				if (manualGames.length > 0) {
					Logger.info(`Found ${manualGames.length} manually tracked games`);
				}
			}

			// Remove duplicates
			const uniqueGames = Array.from(new Map(gamesToTrack.map((game) => [game.id, game])).values());

			if (uniqueGames.length === 0) {
				Logger.info("No games to track today");
				return;
			}

			// Process each game
			for (const game of uniqueGames) {
				await this.createThreadManager(game.id);
			}
		} catch (error) {
			Logger.error("Error checking today's schedule:", error);
		}
	};

	// Creates a GameThreadManager for the specified game ID
	// This GameThreadManager creates a thread and updates with game events
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
					this.manualGameIds.delete(gameId);
					this.saveManualGamesToDisk();
				},
			);
			await threadManager.initialize();
			this.activeManagers.set(gameId, threadManager);
			Logger.info(`Now tracking game ${gameId}`);
		} catch (error) {
			Logger.error(`Error creating thread manager for game ${gameId}:`, error);
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
		Logger.info(`Stopping all ${this.activeManagers.size} active game trackers`);
		this.activeManagers.forEach((manager, gameId) => {
			Logger.info(`Stopping thread manager for game ${gameId}`);
			manager.stop();
		});

		this.activeManagers.clear();
		this.scheduler.stop();
		this.isRunning = false;

		Logger.info("Game schedule monitor stopped");
	}
}
