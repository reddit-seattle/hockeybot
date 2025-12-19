import { ThreadChannel } from "discord.js";
import { delay } from "../../../utils/helpers";
import { Logger } from "../../../utils/Logger";
import { API } from "../API";
import { GameSummary } from "../models/GameSummaryResponse";
import { PBPEvent } from "../models/PlayByPlayResponse";
import { 
	PWHLGameStartEmbedBuilder, 
	PWHLGoalEmbedBuilder, 
	PWHLPenaltyEmbedBuilder, 
	PWHLGameEndEmbedBuilder 
} from "../../../utils/PWHLEmbedFormatters";

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
			await delay(this.delayMs);

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
	}

	private async postGameStart(): Promise<void> {
		if (!this.gameSummary) return;

		const embed = PWHLGameStartEmbedBuilder(this.gameSummary);
		await this.thread.send({ embeds: [embed] });
	}

	private async replayEvents(): Promise<void> {
		if (!this.gameSummary) return;

		// Fetch play-by-play data
		const playByPlay = await API.Games.GetPlayByPlay(this.gameId);

		// Filter for goals and penalties
		const goalEvents = playByPlay.filter((e) => e.event === "goal");
		const penaltyEvents = playByPlay.filter((e) => e.event === "penalty");

		// Combine all events with their type and sort by "time"
		interface Event {
			type: "goal" | "penalty";
			seconds: number;
			data: PBPEvent;
		}

		const events: Event[] = [];

		// Add all goals
		goalEvents.forEach((goal) => {
			events.push({
				type: "goal",
				seconds: goal.s || 0,
				data: goal,
			});
		});

		// Add all penalties
		penaltyEvents.forEach((penalty) => {
			events.push({
				type: "penalty",
				seconds: penalty.s || 0,
				data: penalty,
			});
		});

		// Sort by seconds elapsed in game
		events.sort((a, b) => a.seconds - b.seconds);

		Logger.info(`[PWHL] Replaying ${events.length} events (${goalEvents.length} goals, ${penaltyEvents.length} penalties)...`);

		// Post each event
		for (const event of events) {
			if (!this.isRunning) {
				Logger.info("[PWHL] Replay stopped by user");
				break;
			}

			if (event.type === "goal") {
				await this.postGoal(event.data);
			} else {
				await this.postPenalty(event.data);
			}

			await delay(this.delayMs);
		}
	}

	private async postGoal(goal: PBPEvent): Promise<void> {
		if (!this.gameSummary) return;

		const embed = PWHLGoalEmbedBuilder(goal, this.gameSummary);
		await this.thread.send({ embeds: [embed] });
	}

	private async postPenalty(penalty: PBPEvent): Promise<void> {
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
