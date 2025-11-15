import { TextChannel } from "discord.js";
import * as fs from "fs";
import * as path from "path";
import { CronJob, Task, ToadScheduler } from "toad-scheduler";
import { Config } from "../../../utils/constants";
import { Logger } from "../../../utils/Logger";
import { API } from "../API";
import { MLBGameThreadManager } from "./MLBGameThreadManager";

const MANUAL_GAMES_FILE = "./data/mlb-manual-games.json";
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

        await this.loadManualGamesFromDisk();

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

        Logger.info(`[MLB] Adding game ${gameId} to track (manual: ${isManual})`);

        if (isManual) {
            this.manuallyTrackedGames.add(gameId);
            this.saveManualGamesToDisk();
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

        // Remove from manual tracking
        if (this.manuallyTrackedGames.has(gameId)) {
            this.manuallyTrackedGames.delete(gameId);
            this.saveManualGamesToDisk();
        }
    }

    private async loadManualGamesFromDisk(): Promise<void> {
        try {
            if (fs.existsSync(MANUAL_GAMES_FILE)) {
                const data = fs.readFileSync(MANUAL_GAMES_FILE, "utf8");
                const games = JSON.parse(data) as string[];
                this.manuallyTrackedGames = new Set(games);
                Logger.info(`[MLB] Loaded ${games.length} manual game(s) from disk`);

                // Recreate thread managers for manual games
                await Promise.all(games.map((gameId) => this.createThreadManager(gameId)));
            }
        } catch (error) {
            Logger.error("[MLB] Error loading manual games:", error);
        }
    }

    private saveManualGamesToDisk(): void {
        try {
            // Ensure data directory exists
            const dir = path.dirname(MANUAL_GAMES_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const games = Array.from(this.manuallyTrackedGames);
            fs.writeFileSync(MANUAL_GAMES_FILE, JSON.stringify(games, null, 2));
            Logger.debug(`[MLB] Saved ${games.length} manual game(s) to disk`);
        } catch (error) {
            Logger.error("[MLB] Error saving manual games:", error);
        }
    }

    public stop(): void {
        this.scheduler.stop();
        this.activeThreadManagers.forEach((manager) => manager.stop());
        this.activeThreadManagers.clear();
        Logger.info("[MLB] Schedule monitor stopped");
    }
}
