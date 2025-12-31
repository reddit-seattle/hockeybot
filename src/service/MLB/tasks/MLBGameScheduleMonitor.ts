import { TextChannel } from "discord.js";
import { CronJob, Task, ToadScheduler } from "toad-scheduler";
import { Config } from "../../../utils/constants";
import { Logger } from "../../../utils/Logger";
import { API } from "../API";
import { MLBGameThreadManager } from "./MLBGameThreadManager";

const DAILY_SCHEDULE_CHECK_ID = "mlb_daily_schedule_check";

// Monitors MLB schedule and manages game threads
export class MLBGameScheduleMonitor {
	private channel: TextChannel;
	private favoriteTeamId?: string;
	private scheduler: ToadScheduler = new ToadScheduler();
	private activeThreadManagers: Map<string, MLBGameThreadManager> = new Map();
	private manuallyTrackedGames: Set<string> = new Set();

	constructor(channel: TextChannel, favoriteTeamId?: string) {
		this.channel = channel;
		this.favoriteTeamId = favoriteTeamId;
	}

	public async initialize(): Promise<void> {
		Logger.info("[MLB] Initializing MLB game schedule monitor");

		const dailyCheck = new CronJob(
			{ cronExpression: Config.GAME_CHECKER_CRON, timezone: Config.TIME_ZONE },
			new Task("MLB daily schedule check", this.checkTodaysSchedule),
			{ id: DAILY_SCHEDULE_CHECK_ID, preventOverrun: true },
		);

		this.scheduler.addCronJob(dailyCheck);
		await this.checkTodaysSchedule();

		Logger.info("[MLB] MLB schedule monitor started");
	}

	private checkTodaysSchedule = async (): Promise<void> => {
		try {
			Logger.info("[MLB] Checking today's MLB schedule");

			// Get today's games for favorite team
			const games = await API.Schedule.Today(this.favoriteTeamId || undefined);

			if (!games || games.length === 0) {
				Logger.info("[MLB] No games today for favorite team");
				return;
			}

			Logger.info(`[MLB] Found ${games.length} game(s) today`);

			// Create thread managers for each game
			for (const game of games) {
				const gameId = game.gamePk.toString();
				await this.trackGameById(gameId, false); // false = auto-tracked
			}
		} catch (error) {
			Logger.error("[MLB] Error checking today's schedule:", error);
		}
	};

	public async trackGameById(gameId: string, isManual: boolean = true): Promise<boolean> {
		if (this.activeThreadManagers.has(gameId)) {
			Logger.info(`[MLB] Already tracking game ${gameId}`);
			return false;
		}
		// Create thread manager
		await this.createThreadManager(gameId);
		return true;
	}

	private async createThreadManager(gameId: string): Promise<void> {
		const threadManager = new MLBGameThreadManager(this.channel, gameId, () => this.handleGameComplete(gameId));
		this.activeThreadManagers.set(gameId, threadManager);
		await threadManager.initialize();
	}

	private handleGameComplete(gameId: string): void {
		Logger.info(`[MLB] Game ${gameId} completed, cleaning up`);

		// Remove from active managers
		const manager = this.activeThreadManagers.get(gameId);
		if (manager) {
			manager.stop();
			this.activeThreadManagers.delete(gameId);
		}
	}

	public stop(): void {
		this.scheduler.stop();
		this.activeThreadManagers.forEach((manager) => manager.stop());
		this.activeThreadManagers.clear();
		Logger.info("[MLB] Schedule monitor stopped");
	}
}
