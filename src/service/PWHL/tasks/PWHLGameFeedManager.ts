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
import { hasPeriodStarted } from "../../../utils/helpers";
import { API } from "../API";
import { GameSummary } from "../models/GameSummaryResponse";
import { GoalEvent, PenaltyEvent } from "../models/LiveGameResponse";
import { isPWHLGameFinal } from "../../../utils/enums";

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
	private inIntermission: boolean = false;

	constructor(thread: ThreadChannel, gameId: string, initialSummary: GameSummary, onGameComplete?: () => void) {
		this.thread = thread;
		this.gameId = gameId;
		this.gameSummary = initialSummary;
		this.onGameComplete = onGameComplete;

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

			// update summary
			this.gameSummary = await API.Games.GetGameSummary(this.gameId);

			// goals
			const goalsData = await API.Live.GetGoals(this.gameId);
			if (goalsData?.GameGoals) {
				await this.processGoals(goalsData.GameGoals);
			}

			// penalties
			const penaltiesData = await API.Live.GetPenalties(this.gameId);
			if (penaltiesData?.GamePenalties) {
				await this.processPenalties(penaltiesData.GamePenalties);
			}

			// clock data
			const clockData = await API.Live.GetPublishedClock(this.gameId);
			if (!clockData) {
				Logger.warn(`[PWHL] No clock data found for game ${this.gameId}`);
				return;
			}
			const { PeriodId, Final, ClockMinutes, ClockSeconds } = clockData;
			// debug clock data
			Logger.debug(`[PWHL] Clock data for ${this.gameId}:`, JSON.stringify(clockData, null, 2));

			// period end
			if (ClockMinutes === 0 && ClockSeconds == 0 && !this.inIntermission) {
				await this.announcePeriodEnd(PeriodId);
				this.inIntermission = true;
			}

			// period start
			// todo - just keep track of periodId changing?
			if (this.inIntermission && hasPeriodStarted(ClockMinutes, ClockSeconds, PeriodId)) {
				await this.announcePeriodStart(PeriodId);
				this.inIntermission = false;
			}

			// game over
			const { status_value } = this.gameSummary;
			if (isPWHLGameFinal(status_value ?? "") || Final) {
				await this.handleGameEnd();
			}
		} catch (error) {
			Logger.error(`[PWHL] Error in checkGameStatus for game ${this.gameId}:`, error);
		} finally {
			release();
		}
	};

	private async announcePeriodEnd(period: number): Promise<void> {
		const periodEndEmbed = PWHLPeriodEndEmbedBuilder(period, this.gameSummary!);
		await this.thread.send({ embeds: [periodEndEmbed] });
		Logger.info(`[PWHL] Game ${this.gameId} - Period ${period} ended`);
	}

	private async announcePeriodStart(newPeriod: number): Promise<void> {
		// Send period start embed for new period
		const periodStartEmbed = PWHLPeriodStartEmbedBuilder(newPeriod, this.gameSummary!);
		await this.thread.send({ embeds: [periodStartEmbed] });
		Logger.info(`[PWHL] Game ${this.gameId} - Period ${newPeriod} started`);
	}

	private async processGoals(goals: { [eventId: string]: GoalEvent }): Promise<void> {
		for (const [eventId, goal] of Object.entries(goals)) {
			const existingEvent = this.trackedEvents.get(eventId);

			if (!existingEvent) {
				// New goal message
				await this.processGoal(goal, eventId);
			} else {
				// only update if changed
				if (!isEqual(existingEvent.event, goal)) {
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
				// New penalty message
				await this.processPenalty(penalty, eventId);
			} else {
				// only update if changed
				if (!isEqual(existingEvent.event, penalty)) {
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
