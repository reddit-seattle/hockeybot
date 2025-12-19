import { EmbedBuilder } from "@discordjs/builders";
import { Mutex } from "async-mutex";
import { ThreadChannel } from "discord.js";
import { SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler";
import { Logger } from "../../../utils/Logger";
import {
	PWHLGameEndEmbedBuilder,
	PWHLGoalEmbedBuilder,
	PWHLPenaltyEmbedBuilder,
	PWHLPeriodEndEmbedBuilder,
	PWHLPeriodStartEmbedBuilder,
} from "../../../utils/PWHLEmbedFormatters";
import { Environment } from "../../../utils/constants";
import { API } from "../API";
import { GameSummary } from "../models/GameSummaryResponse";
import { PBPEvent } from "../models/PlayByPlayResponse";

export class PWHLGameFeedManager {
	private scheduler: ToadScheduler = new ToadScheduler();
	private thread: ThreadChannel;
	private gameId: string;
	private gameSummary?: GameSummary;
	private gameOver: boolean = false;
	private eventsMutex: Mutex = new Mutex();
	private onGameComplete?: () => void;

	// Tracking state
	private trackedEvents: Set<string> = new Set();
	private currentPeriod: number = 0;

	constructor(thread: ThreadChannel, gameId: string, initialSummary: GameSummary, onGameComplete?: () => void) {
		this.thread = thread;
		this.gameId = gameId;
		this.gameSummary = initialSummary;
		this.onGameComplete = onGameComplete;

		// Initialize current period
		const periodNum = parseInt(initialSummary?.meta?.period || "0");
		this.currentPeriod = periodNum;

		// Start polling
		const gameStatusChecker = new SimpleIntervalJob(
			{
				seconds: 10,
				runImmediately: true,
			},
			new Task(`PWHL game status [${gameId}]`, this.checkGameStatus),
			{
				id: this.gameId,
				preventOverrun: true,
			}
		);
		this.scheduler.addSimpleIntervalJob(gameStatusChecker);
		Logger.info(`[PWHL] Started feed manager for game ${this.gameId}`);
	}

	private checkGameStatus = async () => {
		const release = await this.eventsMutex.acquire();
		try {
			if (this.gameOver) {
				return Logger.debug(`[PWHL] Game ${this.gameId} is already over, skipping checkGameStatus`);
			}

			// Fetch latest game summary
			const summary = await API.Games.GetGameSummary(this.gameId);
			this.gameSummary = summary;

			const { meta } = summary;
			const currentPeriodNum = parseInt(meta.period || "0");
			const gameStatus = meta.status; // Numeric game status (1=pregame, 2=live, 3/4/5=final)
			const gameStatusString = meta.game_status_string;

			Logger.debug(
				`[PWHL] Game ${this.gameId} - Period ${currentPeriodNum}, Status: ${gameStatus} (${gameStatusString}), Score: ${meta.quick_score}`
			);

			// Debug logging - game feed
			if (Environment.LOCAL_RUN) {
				Logger.debug(`[PWHL] Full game feed for ${this.gameId}:`, JSON.stringify(summary, null, 2));
			}

		// TODO - Currently we only detect when currentPeriodNum increments, which happens when the NEXT period starts.
		// Need to investigate PWHL API to see if there's another indicator of intermission progress.
		// Check for period changes
		if (currentPeriodNum > this.currentPeriod) {
			await this.handlePeriodChange(currentPeriodNum);
			this.currentPeriod = currentPeriodNum;
		}

			// Fetch play-by-play data to get goal and penalty details
			const playByPlay = await API.Games.GetPlayByPlay(this.gameId);

			// Process plays
			await this.processPlayByPlayEvents(playByPlay);

			// Check if game is over (status 3, 4, or 5)
			const FINAL_STATUSES = ["3", "4", "5"];
			if (FINAL_STATUSES.includes(gameStatus)) {
				await this.handleGameEnd();
			}
		} catch (error) {
			Logger.error(`[PWHL] Error in checkGameStatus for game ${this.gameId}:`, error);
		} finally {
			release();
		}
	};

	private async handlePeriodChange(newPeriod: number): Promise<void> {
		// Send period end embed for previous period (except when period 1 starts)
		if (newPeriod > 1) {
			const periodEndEmbed = PWHLPeriodEndEmbedBuilder(newPeriod - 1, this.gameSummary!);
			await this.thread.send({ embeds: [periodEndEmbed] });
			Logger.info(`[PWHL] Game ${this.gameId} - Period ${newPeriod - 1} ended`);
		}

		// Send period start embed for new period
		const periodStartEmbed = PWHLPeriodStartEmbedBuilder(newPeriod, this.gameSummary!);
		await this.thread.send({ embeds: [periodStartEmbed] });
		Logger.info(`[PWHL] Game ${this.gameId} - Period ${newPeriod} started`);
	}

	private async processPlayByPlayEvents(events: PBPEvent[]): Promise<void> {
		// Filter to only events we care about
		const relevantEvents = events.filter((e) => e.event === "goal" || e.event === "penalty");

		for (const event of relevantEvents) {
			// Create unique ID for this event
			const eventId =
				event.id || `${event.team_id}-${event.period_id}-${event.time_formatted || event.time_off_formatted}`;

			if (this.trackedEvents.has(eventId)) {
				continue; // Already processed
			}

			// Mark as tracked
			this.trackedEvents.add(eventId);

			// Process based on event type
			switch (event.event) {
				case "goal":
					await this.processGoal(event);
					break;
				case "penalty":
					await this.processPenalty(event);
					break;
				default:
					Logger.warn(`[PWHL] Unhandled event type: ${event.event}`);
			}
		}
	}

	private async processGoal(goal: PBPEvent): Promise<void> {
		const embed = PWHLGoalEmbedBuilder(goal, this.gameSummary!);
		await this.thread.send({ embeds: [embed] });

		const scorerName = goal.goal_scorer
			? `${goal.goal_scorer.first_name} ${goal.goal_scorer.last_name}`
			: "Unknown";
		Logger.info(`[PWHL] Game ${this.gameId} - Goal by ${scorerName}`);
	}

	private async processPenalty(penalty: PBPEvent): Promise<void> {
		const embed = PWHLPenaltyEmbedBuilder(penalty, this.gameSummary!);
		await this.thread.send({ embeds: [embed] });

		const playerName = penalty.player_penalized_info
			? `${penalty.player_penalized_info.first_name} ${penalty.player_penalized_info.last_name}`
			: "Unknown";
		Logger.info(`[PWHL] Game ${this.gameId} - Penalty: ${playerName} - ${penalty.lang_penalty_description}`);
	}

	private async handleGameEnd(): Promise<void> {
		if (this.gameOver) {
			return;
		}

		this.gameOver = true;
		Logger.info(`[PWHL] Game ${this.gameId} has ended`);

		// Create game summary embed
		const embed = PWHLGameEndEmbedBuilder(this.gameSummary as GameSummary);
		await this.thread.send({ embeds: [embed] });

		// Stop polling
		this.stop();

		// Notify completion
		if (this.onGameComplete) {
			this.onGameComplete();
		}
	}

	public stop(): void {
		if (this.scheduler.existsById(this.gameId)) {
			this.scheduler.stopById(this.gameId);
			Logger.info(`[PWHL] Stopped feed manager for game ${this.gameId}`);
		}
	}

	public start(): void {
		this.scheduler.startById(this.gameId);
	}
}
