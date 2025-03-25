import { EmbedBuilder } from "@discordjs/builders";
import { Mutex } from "async-mutex";
import { Message, ThreadChannel } from "discord.js";
import { SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler";
import { all, isEqual, omit, uniqueId } from "underscore";
import { API } from "../service/API";
import { Play, PlayByPlayResponse } from "../service/models/responses/PlayByPlayResponse";
import { Environment } from "../utils/constants";
import { GameFeedEmbedFormatter } from "../utils/EmbedFormatters";
import { EventTypeCode } from "../utils/enums";
import { isGameOver, logDiff } from "../utils/helpers";

/**
 * TODOs
 * Extra stats on intermission messages (shots, hits, etc)
 * Update game start message with teams records / starting lineups
 * Better shootout / overtime handling
 * Handle successful challenges
 * Handle goalie changes
 */

const tracked_types = [EventTypeCode.goal, EventTypeCode.penalty, EventTypeCode.periodStart, EventTypeCode.periodEnd];

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

    private events: Map<string, PlayMessageContainer> = new Map<string, PlayMessageContainer>();

    constructor(thread: ThreadChannel, feed: PlayByPlayResponse) {
        this.thread = thread;
        this.gameId = feed.id;
        this.embedFormatter = new GameFeedEmbedFormatter(feed);
        const gameStatusChecker = new SimpleIntervalJob(
            {
                seconds: 10,
                runImmediately: true,
            },
            new Task("check for game status", this.checkGameStatus),
            {
                id: this.gameId,
                preventOverrun: true,
            }
        );
        this.scheduler.addSimpleIntervalJob(gameStatusChecker);
    }

    // TODO - refactor and clean up this function
    private checkGameStatus = async () => {
        const release = await this.eventsMutex.acquire();
        try {
            if (this.gameOver) {
                console.log("Game is already over, skipping checkGameStatus");
                return;
            }
            const { gameState, awayTeam, homeTeam, clock, periodDescriptor } = await API.Games.GetBoxScore(this.gameId);
            const periodNumber = periodDescriptor?.number || 1;

            // state / iteration unique key
            const stateKey = uniqueId(`${this.gameId}-${periodNumber}-${clock.timeRemaining}`);
            // log main game loop
            console.log(
                `{${stateKey}} CheckGameStatus - Score: ${awayTeam.commonName.default} ${awayTeam?.score || 0}, ${
                    homeTeam.commonName.default
                } ${homeTeam?.score || 0} - ${clock.timeRemaining} - ${
                    clock.inIntermission ? "Intermission" : "Period"
                } ${periodNumber} - (${gameState})`
            );
            // check if game is over
            if (isGameOver(gameState)) {
                console.log("Writing Game Over message");
                const scoreEmbed = this.embedFormatter.createGameEndEmbed();
                this.gameOver == false &&
                    (await this?.thread?.send({
                        embeds: [scoreEmbed],
                    }));

                console.log("Game is over, stopping game feed");
                this.gameOver = true;

                console.log("Archiving thread");
                await this?.thread?.setArchived(true, "game over").catch(console.error);
                // console.log("Deleting all events");
                // this.events.clear();
                console.log("Stopping game feed scheduler");
                this.Stop();
                return;
            }
            // map old game event ids
            const trackedEvents = Array.from(this.events.keys());

            // game feed update
            const { plays: allPlays } = await this.getFeed(true);

            // filter out plays that are not in the tracked types (once)
            const plays = allPlays.filter((play) => tracked_types.includes(play.typeCode));
            console.log(
                `{${stateKey}} Processing ${plays.length} plays: [${plays.map((play) => play.eventId).join(", ")}]`
            );

            // remove any events that are no longer in the feed
            const newEventIds = plays.map((play) => play.eventId);
            const removedEventIds = trackedEvents.filter((eventId) => !newEventIds.includes(eventId));

            // remove them from the tracked events
            for (const eventId of removedEventIds) {
                if (this.events.has(eventId)) {
                    const event = this.events.get(eventId);
                    // if the event has a message, delete it
                    console.log(
                        `{${stateKey}} Deleting removed event ${eventId} - ${event?.play.typeDescKey} - message link: ${event?.message?.url}`
                    );
                    await event?.message?.delete();
                    this.events.delete(eventId);
                }
            }

            // re-process each play and update message
            await Promise.all(
                plays.map(async (play) => {
                    const startTime = Date.now();
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
                            const existingEmbed = this.events.get(play.eventId)?.message?.embeds?.[0];
                            embed = existingEmbed
                                ? this.embedFormatter.updateIntermissionEmbed(play, existingEmbed)
                                : this.embedFormatter.createIntermissionEmbed(play);
                            break;
                    }
                    const embedDuration = Date.now() - startTime;
                    if (embed) {
                        const { eventId } = play;
                        const messageOpts = { embeds: [embed] };
                        // if we're not tracking this event
                        if (!this.events.has(eventId)) {
                            // send a new message
                            const message = await this.thread?.send(messageOpts);
                            this.events.set(eventId, { message: message, play: play });
                            console.log(
                                `${eventId} not found in tracked events, created new message for event ${eventId} - ${play.typeDescKey} - ${message.url}`
                            );
                        } else {
                            // otherwise, see if we need to update the message
                            const existingEvent = this.events.get(eventId);
                            const existingMessage = existingEvent?.message;
                            // TODO - optimize by only checking relevant props)
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
                                this.events.set(eventId, { message: editedMessage ?? existingMessage, play });
                                console.log(
                                    `{${stateKey}} Updated event ${eventId} - ${play.typeDescKey} - ${existingMessage?.url}`
                                );
                                // try to log difference between old and new play details
                                try {
                                    const diff = omit(
                                        play?.details,
                                        (value, key) =>
                                            existingEvent?.play?.details?.[key as keyof typeof play.details] === value
                                    );
                                    console.log(`diff:\n${JSON.stringify(diff)}`);
                                } catch (error) {
                                    console.error("Error logging diff", error);
                                }
                            } else {
                                console.log(
                                    `{${stateKey}} Skipping update for event ${eventId} - ${play.typeDescKey} - ${existingMessage?.url}`
                                );
                            }
                        }
                    }
                    const finishedTime = Date.now();
                    const totalDuration = finishedTime - startTime;
                    const messageDuration = totalDuration - embedDuration;
                    console.log(
                        `Processed embed for event ${play.eventId} (${play.typeCode}): ${embedDuration}ms (embed), ${messageDuration}ms (message) - total: ${totalDuration}ms`
                    );
                })
            );
            console.log(`{${stateKey}} Finished processing, events: [${Array.from(this.events.keys()).join(", ")}]`);
        } catch (error) {
            console.error("Error in checkGameStatus", error);
        } finally {
            release();
        }
    };

    // Maybe we could use https://api-web.nhle.com/v1/gamecenter/2023020204/landing
    // to get the game state and other info? rather than a huge list of plays and parsing them
    // todo - determine delays / performance of each option - does landing mean we don't need to poll for updates, will we get things too delayed?
    private getFeed = async (force: boolean = false): Promise<PlayByPlayResponse> => {
        if (force || !this.feed) {
            const newFeed = await API.Games.GetPlays(this.gameId);
            // first time we're setting feed, mark all previous plays as tracked, but with no message to update
            // TODO - flip with env var for testing
            if (this.feed === undefined) {
                for (const play of newFeed.plays) {
                    if (tracked_types.includes(play.typeCode) && !this.events.has(play.eventId)) {
                        this.events.set(play.eventId, { message: undefined, play: play });
                    }
                }
            }
            // log the diff of the plays (time consuming?)
            if (Environment.LOCAL_RUN) {
                logDiff(this.feed, newFeed);
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
