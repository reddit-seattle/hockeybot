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

export class PWHLGameReplayManager {
	private thread: ThreadChannel;
	private gameId: string;
	private gameSummary?: GameSummary;
	private isRunning: boolean = false;
	private delayMs: number = 100;

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
			await this.loadGameData();
			if (!this.gameSummary) {
				throw new Error("Failed to load game summary");
			}
			await this.announceGameStart();
			await this.replayEvents();
			await this.announceGameEnd();
			Logger.info(`[PWHL] Game replay completed for ${this.gameId}`);
		} catch (error) {
			Logger.error(`[PWHL] Error during game replay for ${this.gameId}:`, error);
			await this.thread.send(`Error during replay: ${error}`);
			throw error; // Re-throw so the command can handle cleanup
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
		const shotsData = await API.Live.GetShotsSummary(this.gameId);
		if (shotsData) {
			(this.gameSummary as any).totalShots = {
				home: shotsData.HomeShotTotal,
				visitor: shotsData.VisitorShotTotal,
			};
		}
	}

	private async announceGameStart(): Promise<void> {
		if (!this.gameSummary) return;

		const embed = PWHLGameStartEmbedBuilder(this.gameSummary);
		await this.thread.send({ embeds: [embed] });
	}

	private async replayEvents(): Promise<void> {
		if (!this.gameSummary) return;

		const goalsData = await API.Live.GetGoals(this.gameId);
		const penaltiesData = await API.Live.GetPenalties(this.gameId);
		if (!goalsData && !penaltiesData) {
			throw new Error(`No live event data available for game ${this.gameId}, cannot replay.`);
		}
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

		// Sort
		events.sort((a, b) => a.eventId - b.eventId);

		const goalCount = goalsData?.GameGoals ? Object.keys(goalsData.GameGoals).length : 0;
		const penaltyCount = penaltiesData?.GamePenalties ? Object.keys(penaltiesData.GamePenalties).length : 0;

		Logger.info(`[PWHL] Replaying ${events.length} events (${goalCount} goals, ${penaltyCount} penalties)...`);

		// Track running score for replay
		let homeScore = 0;
		let awayScore = 0;

		// Post each event
		for (const event of events) {
			if (!this.isRunning) {
				Logger.info("[PWHL] Replay stopped by user");
				break;
			}

			if (event.type === "goal") {
				// we gotta track goals for reasons
				const goalEvent = event.data as GoalEvent;
				if (goalEvent.IsHome) {
					homeScore++;
				} else {
					awayScore++;
				}
				await this.postGoal(goalEvent, homeScore, awayScore);
			} else {
				await this.postPenalty(event.data as PenaltyEvent);
			}
			await delay(this.delayMs);
		}
	}

	private async postGoal(goal: GoalEvent, homeScore: number, awayScore: number): Promise<void> {
		if (!this.gameSummary) return;

		// Use meta.quick_score to track running score
		this.gameSummary.meta.quick_score = `${awayScore}-${homeScore}`;

		const embed = PWHLGoalEmbedBuilder(goal, this.gameSummary);
		await this.thread.send({ embeds: [embed] });
	}

	private async postPenalty(penalty: PenaltyEvent): Promise<void> {
		if (!this.gameSummary) return;
		const embed = PWHLPenaltyEmbedBuilder(penalty, this.gameSummary);
		await this.thread.send({ embeds: [embed] });
	}

	private async announceGameEnd(): Promise<void> {
		if (!this.gameSummary) return;
		const embed = PWHLGameEndEmbedBuilder(this.gameSummary);
		await this.thread.send({ embeds: [embed] });
	}
}
