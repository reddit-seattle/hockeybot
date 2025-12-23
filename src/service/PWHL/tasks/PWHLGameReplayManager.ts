import { ThreadChannel } from "discord.js";
import { delay } from "../../../utils/helpers";
import { Logger } from "../../../utils/Logger";
import {
	PWHLGameEndEmbedBuilder,
	PWHLGameStartEmbedBuilder,
	PWHLGoalEmbedBuilder,
	PWHLPenaltyEmbedBuilder,
} from "../../../utils/PWHLEmbedFormatters";
import { API } from "../API";
import { GameSummary } from "../models/GameSummaryResponse";
import { GoalEvent, PenaltyEvent } from "../models/LiveGameResponse";

/**
 * Replays a completed PWHL game for testing/debugging
 * Posts all goals, penalties, and final score in sequence
 */
export class PWHLGameReplayManager {
	private thread: ThreadChannel;
	private gameId: string;
	private gameSummary?: GameSummary;
	private isRunning: boolean = false;
	private delayMs: number = 500; // 500ms between messages

	constructor(thread: ThreadChannel, gameId: string) {
		this.thread = thread;
		this.gameId = gameId;
	}

	public async start(): Promise<void> {
		if (this.isRunning) {
			Logger.warn(`[PWHL] Replay already running for game ${this.gameId}`);
			return;
		}

		this.isRunning = true;
		Logger.info(`[PWHL] Starting game replay for ${this.gameId}`);

		try {
			// Fetch the complete game data
			await this.loadGameData();
			if (!this.gameSummary) {
				throw new Error("Failed to load game summary");
			}

			// Post game start
			await this.postGameStart();

			// Replay all events in chronological order
			await this.replayEvents();

			// Post game end summary
			await this.postGameEnd();

			Logger.info(`[PWHL] Game replay completed for ${this.gameId}`);
		} catch (error) {
			Logger.error(`[PWHL] Error during game replay for ${this.gameId}:`, error);
			await this.thread.send(`Error during replay: ${error}`);
		} finally {
			this.isRunning = false;
		}
	}

	public stop(): void {
		this.isRunning = false;
		Logger.info(`[PWHL] Stopping game replay for ${this.gameId}`);
	}

	private async loadGameData(): Promise<void> {
		Logger.info(`[PWHL] Loading game data for ${this.gameId}`);
		this.gameSummary = await API.Games.GetGameSummary(this.gameId);

		// Also load shots data for the embeds
		const shotsData = await API.Live.GetShotsSummary(this.gameId);
		if (shotsData) {
			(this.gameSummary as any).totalShots = {
				home: shotsData.HomeShotTotal,
				visitor: shotsData.VisitorShotTotal,
			};
		}
	}

	private async postGameStart(): Promise<void> {
		if (!this.gameSummary) return;

		const embed = PWHLGameStartEmbedBuilder(this.gameSummary);
		await this.thread.send({ embeds: [embed] });
	}

	private async replayEvents(): Promise<void> {
		if (!this.gameSummary) return;

		// Fetch live data
		const goalsData = await API.Live.GetGoals(this.gameId);
		const penaltiesData = await API.Live.GetPenalties(this.gameId);

		if (!goalsData && !penaltiesData) {
			Logger.warn(`[PWHL] No live event data found for game ${this.gameId}`);
			return;
		}

		// Combine all events with their type and sort by time
		interface Event {
			type: "goal" | "penalty";
			eventId: number;
			data: GoalEvent | PenaltyEvent;
		}

		const events: Event[] = [];

		// Add all goals
		if (goalsData?.GameGoals) {
			Object.values(goalsData.GameGoals).forEach((goal) => {
				events.push({
					type: "goal",
					eventId: goal.LSEventId,
					data: goal,
				});
			});
		}

		// Add all penalties
		if (penaltiesData?.GamePenalties) {
			Object.values(penaltiesData.GamePenalties).forEach((penalty) => {
				events.push({
					type: "penalty",
					eventId: penalty.LSEventId,
					data: penalty,
				});
			});
		}

		// Sort by event ID (chronological order)
		events.sort((a, b) => a.eventId - b.eventId);

		const goalCount = goalsData?.GameGoals ? Object.keys(goalsData.GameGoals).length : 0;
		const penaltyCount = penaltiesData?.GamePenalties ? Object.keys(penaltiesData.GamePenalties).length : 0;

		Logger.info(`[PWHL] Replaying ${events.length} events (${goalCount} goals, ${penaltyCount} penalties)...`);

		// Post each event
		for (const event of events) {
			if (!this.isRunning) {
				Logger.info("[PWHL] Replay stopped by user");
				break;
			}

			if (event.type === "goal") {
				await this.postGoal(event.data as GoalEvent);
			} else {
				await this.postPenalty(event.data as PenaltyEvent);
			}

			await delay(this.delayMs);
		}
	}

	private async postGoal(goal: GoalEvent): Promise<void> {
		if (!this.gameSummary) return;

		const embed = PWHLGoalEmbedBuilder(goal, this.gameSummary);
		await this.thread.send({ embeds: [embed] });
	}

	private async postPenalty(penalty: PenaltyEvent): Promise<void> {
		if (!this.gameSummary) return;

		const embed = PWHLPenaltyEmbedBuilder(penalty, this.gameSummary);
		await this.thread.send({ embeds: [embed] });
	}

	private async postGameEnd(): Promise<void> {
		if (!this.gameSummary) return;

		const embed = PWHLGameEndEmbedBuilder(this.gameSummary);
		await this.thread.send({ embeds: [embed] });
	}
}
