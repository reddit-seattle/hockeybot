import { Mutex } from "async-mutex";
import { Message, ThreadChannel } from "discord.js";
import { SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler";
import { isEqual } from "underscore";
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
import { GoalEvent, PenaltyEvent, PublishedClockData } from "../models/LiveGameResponse";

interface EventContainer {
	message?: Message;
	event: GoalEvent | PenaltyEvent;
}

export class PWHLGameFeedManager {
	private scheduler: ToadScheduler = new ToadScheduler();
	private thread: ThreadChannel;
	private gameId: string;
	private gameSummary?: GameSummary;
	private gameOver: boolean = false;
	private eventsMutex: Mutex = new Mutex();
	private onGameComplete?: () => void;

	// Tracking state
	private trackedEvents: Map<string, EventContainer> = new Map();
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
			},
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

			// Fetch live data
			const clockData = await API.Live.GetPublishedClock(this.gameId);
			const shotsData = await API.Live.GetShotsSummary(this.gameId);

			if (!clockData) {
				Logger.warn(`[PWHL] No clock data found for game ${this.gameId}`);
				return;
			}

			// Update summary with shots data
			if (shotsData) {
				(this.gameSummary as any).totalShots = {
					home: shotsData.HomeShotTotal,
					visitor: shotsData.VisitorShotTotal,
				};
			}

			const currentPeriodNum = clockData.PeriodId;
			const gameStatus = clockData.StatusId.toString();
			const isFinal = clockData.Final;

			Logger.debug(
				`[PWHL] Game ${this.gameId} - Period ${currentPeriodNum} (${clockData.PeriodLongName}), Status: ${gameStatus} (${clockData.StatusName}), Progress: ${clockData.ProgressString}`,
			);

			// Debug logging - game feed
			if (Environment.LOCAL_RUN) {
				Logger.debug(`[PWHL] Clock data for ${this.gameId}:`, JSON.stringify(clockData, null, 2));
			}

			// Check for period changes
			if (currentPeriodNum > this.currentPeriod) {
				await this.handlePeriodChange(currentPeriodNum, clockData);
				this.currentPeriod = currentPeriodNum;
			}

			// process goals
			const goalsData = await API.Live.GetGoals(this.gameId);
			if (goalsData?.GameGoals) {
				await this.processGoals(goalsData.GameGoals);
			}

			// process penalties
			const penaltiesData = await API.Live.GetPenalties(this.gameId);
			if (penaltiesData?.GamePenalties) {
				await this.processPenalties(penaltiesData.GamePenalties);
			}

			// Check if game is over
			if (isFinal) {
				await this.handleGameEnd();
			}
		} catch (error) {
			Logger.error(`[PWHL] Error in checkGameStatus for game ${this.gameId}:`, error);
		} finally {
			release();
		}
	};

	private async handlePeriodChange(newPeriod: number, clockData: PublishedClockData): Promise<void> {
		// Send period end embed for previous period (except when period 1 starts)
		if (newPeriod > 1) {
			const periodEndEmbed = PWHLPeriodEndEmbedBuilder(newPeriod - 1, this.gameSummary!);
			await this.thread.send({ embeds: [periodEndEmbed] });
			Logger.info(`[PWHL] Game ${this.gameId} - Period ${newPeriod - 1} ended`);
		}

		// Send period start embed for new period
		const periodStartEmbed = PWHLPeriodStartEmbedBuilder(newPeriod, this.gameSummary!);
		await this.thread.send({ embeds: [periodStartEmbed] });
		Logger.info(`[PWHL] Game ${this.gameId} - Period ${newPeriod} (${clockData.PeriodLongName}) started`);
	}

	private async processGoals(goals: { [eventId: string]: GoalEvent }): Promise<void> {
		for (const [eventId, goal] of Object.entries(goals)) {
			const existingEvent = this.trackedEvents.get(eventId);

			if (!existingEvent) {
				// New goal - send message
				await this.processGoal(goal, eventId);
			} else {
				// Check if goal data has changed
				if (!isEqual(existingEvent.event, goal)) {
					// update message
					const embed = PWHLGoalEmbedBuilder(goal, this.gameSummary!);
					const editedMessage = await existingEvent.message?.edit({ embeds: [embed] });
					this.trackedEvents.set(eventId, { message: editedMessage ?? existingEvent.message, event: goal });

					const scorerName = `${goal.ScorerPlayerFirstName} ${goal.ScorerPlayerLastName}`;
					Logger.info(`[PWHL] Game ${this.gameId} - Goal updated: ${scorerName} (${eventId})`);
				}
			}
		}
	}

	private async processPenalties(penalties: { [eventId: string]: PenaltyEvent }): Promise<void> {
		for (const [eventId, penalty] of Object.entries(penalties)) {
			const existingEvent = this.trackedEvents.get(eventId);

			if (!existingEvent) {
				// New penalty - send message
				await this.processPenalty(penalty, eventId);
			} else {
				// Check if penalty data has changed
				if (!isEqual(existingEvent.event, penalty)) {
					// update message
					const embed = PWHLPenaltyEmbedBuilder(penalty, this.gameSummary!);
					const editedMessage = await existingEvent.message?.edit({ embeds: [embed] });
					this.trackedEvents.set(eventId, {
						message: editedMessage ?? existingEvent.message,
						event: penalty,
					});

					const playerName = `${penalty.PenalizedPlayerFirstName} ${penalty.PenalizedPlayerLastName}`;
					Logger.info(`[PWHL] Game ${this.gameId} - Penalty updated: ${playerName} (${eventId})`);
				}
			}
		}
	}

	private async processGoal(goal: GoalEvent, eventId: string): Promise<void> {
		const embed = PWHLGoalEmbedBuilder(goal, this.gameSummary!);
		const message = await this.thread.send({ embeds: [embed] });
		this.trackedEvents.set(eventId, { message, event: goal });

		const scorerName = `${goal.ScorerPlayerFirstName} ${goal.ScorerPlayerLastName}`;
		Logger.info(`[PWHL] Game ${this.gameId} - Goal by ${scorerName} (${eventId})`);
	}

	private async processPenalty(penalty: PenaltyEvent, eventId: string): Promise<void> {
		const embed = PWHLPenaltyEmbedBuilder(penalty, this.gameSummary!);
		const message = await this.thread.send({ embeds: [embed] });
		this.trackedEvents.set(eventId, { message, event: penalty });

		const playerName = `${penalty.PenalizedPlayerFirstName} ${penalty.PenalizedPlayerLastName}`;
		Logger.info(`[PWHL] Game ${this.gameId} - Penalty: ${playerName} - ${penalty.OffenceDescription} (${eventId})`);
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
