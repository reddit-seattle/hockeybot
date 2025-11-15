import { EmbedBuilder } from "@discordjs/builders";
import { Mutex } from "async-mutex";
import { Message, ThreadChannel } from "discord.js";
import { SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler";
import { all, isEqual, uniqueId } from "underscore";
import { Config, Environment } from "../../../utils/constants";
import { GameFeedEmbedFormatter } from "../../../utils/EmbedFormatters";
import { EventTypeCode, GameState } from "../../../utils/enums";
import { isGameOver } from "../../../utils/helpers";
import { Logger } from "../../../utils/Logger";
import { API } from "../API";
import { Play, PlayByPlayResponse } from "../models/PlayByPlayResponse";

/**
 * TODOs
 * Extra stats on intermission messages (shots, hits, etc)
 * Update game start message with teams records / starting lineups
 * Better shootout / overtime handling
 * Handle successful challenges
 * Handle goalie changes
 */

interface PlayMessageContainer {
	message?: Message;
	play: Play;
}

export class GameFeedManager {
	private scheduler: ToadScheduler = new ToadScheduler();
	private thread: ThreadChannel;
	private gameId: string;
	private feed?: PlayByPlayResponse;
	private embedFormatter: GameFeedEmbedFormatter;
	private gameOver: boolean = false;
	private eventsMutex: Mutex = new Mutex();
	private onGameComplete?: () => void;

	private trackedEvents: Map<string, PlayMessageContainer> = new Map<string, PlayMessageContainer>();

	constructor(thread: ThreadChannel, feed: PlayByPlayResponse, onGameComplete?: () => void) {
		this.thread = thread;
		this.gameId = feed.id;
		this.embedFormatter = new GameFeedEmbedFormatter(feed);
		this.onGameComplete = onGameComplete;
		const gameStatusChecker = new SimpleIntervalJob(
			{
				seconds: 10,
				runImmediately: true,
			},
			new Task("check for game status", this.checkGameStatus),
			{
				id: this.gameId,
				preventOverrun: true,
			},
		);
		this.scheduler.addSimpleIntervalJob(gameStatusChecker);
	}

	// TODO - pull out some consolidated logic
	private checkGameStatus = async () => {
		const release = await this.eventsMutex.acquire();
		try {
			if (this.gameOver) {
				return Logger.info("Game is already over, skipping checkGameStatus");
			}
			const { gameState, awayTeam, homeTeam, clock, periodDescriptor } = await API.Games.GetBoxScore(this.gameId);
			const periodNumber = periodDescriptor?.number || 1;

			// state / iteration unique key
			const stateKey = uniqueId(`${this.gameId}-${periodNumber}-${clock.timeRemaining}`);
			// log main game loop
			Logger.debug(
				`{${stateKey}} CheckGameStatus - Score: ${awayTeam.commonName.default} ${awayTeam?.score || 0}, ${
					homeTeam.commonName.default
				} ${homeTeam?.score || 0} - ${clock.timeRemaining} - ${
					clock.inIntermission ? "Intermission" : "Period"
				} ${periodNumber} - (${gameState})`,
			);
			// check if game is over
			if (isGameOver(gameState)) {
				await this.handleGameEnd();
				return;
			}
			// map old game event ids
			const trackedEventIds = Array.from(this.trackedEvents.keys());

			// game feed update
			const { plays: allPlays } = await this.getFeed(true);

			// filter out plays that are not in the tracked types (once)
			const trackedPlays = allPlays.filter((play) => Config.TRACKED_NHL_EVENT_TYPES.includes(play.typeCode));
			Logger.debug(
				`{${stateKey}} Tracking ${trackedPlays.length} plays: [${trackedPlays
					.map((play) => play.eventId)
					.join(", ")}]`,
			);

			// remove any events that are no longer in the feed
			const newEventIds = trackedPlays.map((play) => play.eventId);
			const removedEventIds = trackedEventIds.filter((eventId) => !newEventIds.includes(eventId));

			// remove them from the tracked events
			for (const removedEventId of removedEventIds) {
				if (this.trackedEvents.has(removedEventId)) {
					const removeEvent = this.trackedEvents.get(removedEventId);
					await removeEvent?.message?.delete();
					this.trackedEvents.delete(removedEventId);
				}
			}

			// process each play and update message
			await Promise.all(
				trackedPlays.map(async (play) => {
					let embed: EmbedBuilder | undefined;
					switch (play.typeCode) {
						case EventTypeCode.goal:
							embed = this.embedFormatter.createGoalEmbed(play);
							break;
						case EventTypeCode.penalty:
							embed = this.embedFormatter.createPenaltyEmbed(play);
							break;
						case EventTypeCode.periodStart:
						case EventTypeCode.periodEnd:
							const existingEmbed = this.trackedEvents.get(play.eventId)?.message?.embeds?.[0];
							embed = existingEmbed
								? this.embedFormatter.updateIntermissionEmbed(play, existingEmbed)
								: this.embedFormatter.createIntermissionEmbed(play);
							break;
					}
					if (embed) {
						const { eventId, typeDescKey } = play;
						const messageOpts = { embeds: [embed] };
						// if we're not tracking this event
						if (!this.trackedEvents.has(eventId)) {
							// send a new message
							const message = await this.thread?.send(messageOpts);
							this.trackedEvents.set(eventId, { message, play });
							Logger.debug(`New message for event ${eventId} - ${typeDescKey} - ${message.url}`);
						} else {
							// otherwise, see if we need to update the message
							const existingEvent = this.trackedEvents.get(eventId);
							const existingMessage = existingEvent?.message;
							// check if the play details have changed
							if (
								!isEqual(existingEvent?.play?.details, play.details) ||
								// period end messages can update with current intermission time
								all([
									play.typeCode === EventTypeCode.periodEnd, // period end
									play.periodDescriptor?.number == this.feed?.periodDescriptor.number, // same period as feed
									this.feed?.clock.inIntermission == true, // currently in intermission
								])
							) {
								// if so, edit the message and update with new details
								const editedMessage = await existingMessage?.edit(messageOpts);
								this.trackedEvents.set(eventId, { message: editedMessage ?? existingMessage, play });
							}
						}
					}
				}),
			);
		} catch (error) {
			Logger.error("Error in checkGameStatus", error);
		} finally {
			release();
		}
	};

	private handleGameEnd = async () => {
		this.gameOver = true;

		// Create initial game end embed
		const scoreEmbed = this.embedFormatter.createGameEndEmbed();
		const gameEndMessage = await this?.thread?.send({ embeds: [scoreEmbed] });

		// Start polling for story updates
		this.startStoryPolling(gameEndMessage);

		// Stop main game status checker
		this.Stop();
	};

	/**
	 * Polls for story updates, tracking state transitions and updating the embed with new data
	 * Continues until OFFICIAL state, then polls for 5 more minutes before cleanup
	 */
	private startStoryPolling = (gameEndMessage: Message) => {
		let officialStateReached = false;
		let officialStateTime: number | null = null;
		const POLL_INTERVAL_MS = 1000 * 30; // 30 seconds
		const POLLING_AFTER_OFFICIAL_MS = 1000 * 60 * 5; // 5 minutes
		const POLLING_DELAY_MS = 1000 * 60; // 1 minute

		const pollStory = async (): Promise<void> => {
			const boxScore = await API.Games.GetBoxScore(this.gameId);
			const currentState = boxScore.gameState;

			// Check if (and when) we've reached official end state
			if (currentState === GameState.official && !officialStateReached) {
				officialStateReached = true;
				officialStateTime = Date.now();
			}

			// Try to get story data and send as new message
			const story = await API.Games.GetStory(this.gameId);

			if (story?.summary) {
				// Log what's available
				const threeStars = story.summary.threeStars?.length || 0;
				const gameStats = story.summary.teamGameStats?.length || 0;
				// Send story summary as new message if we have meaningful data
				if (threeStars > 0 || gameStats > 0) {
					const storyEmbed = this.embedFormatter.createStoryEmbed(story);
					await this?.thread?.send({ embeds: [storyEmbed] });
					// Stop polling after successfully sending story
					Logger.info(`[GAME END] Story data sent for game ${this.gameId}`);
					this.finalizeGameThread();
					return;
				}
			}

			// Determine if we should continue polling
			const shouldContinue =
				!officialStateReached || Date.now() - (officialStateTime || 0) < POLLING_AFTER_OFFICIAL_MS;

			if (shouldContinue) {
				setTimeout(pollStory, POLL_INTERVAL_MS);
			} else {
				Logger.info(`[GAME END] Polling complete for game ${this.gameId}`);
				this.finalizeGameThread();
			}
		};
		// Start polling after 1 minute
		setTimeout(pollStory, POLLING_DELAY_MS);
	};

	/**
	 * Cleanup after game is complete
	 */
	private finalizeGameThread = () => {
		Logger.info(`[GAME END] Finalizing game ${this.gameId}`);
		if (this.onGameComplete) {
			this.onGameComplete();
		}
	};

	private getFeed = async (force: boolean = false): Promise<PlayByPlayResponse> => {
		if (force || !this.feed) {
			const newFeed = await API.Games.GetPlays(this.gameId);
			// first time we're setting feed, local_run switch will replay all messages for debugging purposes
			if (this.feed === undefined || Environment.LOCAL_RUN) {
				for (const play of newFeed.plays) {
					// mark all previous plays as tracked, no message
					if (
						Config.TRACKED_NHL_EVENT_TYPES.includes(play.typeCode) &&
						!this.trackedEvents.has(play.eventId)
					) {
						this.trackedEvents.set(play.eventId, { message: undefined, play: play });
					}
				}
			}
			// update the feed
			this.feed = newFeed;
			this.embedFormatter.updateFeed(this.feed);
		}
		return this.feed;
	};

	public Stop = () => {
		if (this.scheduler.existsById(this.gameId)) {
			this.scheduler.stopById(this.gameId);
		}
	};
	public Start = () => {
		return this.scheduler.startById(this.gameId);
	};
	public Status = () => {
		return this.scheduler.getById(this.gameId);
	};
}
