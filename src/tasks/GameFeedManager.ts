import { EmbedBuilder } from "@discordjs/builders";
import { Message, ThreadChannel } from "discord.js";
import { SimpleIntervalJob, Task, ToadScheduler } from "toad-scheduler";
import { uniqueId } from "underscore";
import { API } from "../service/API";
import { Play, PlayByPlayResponse } from "../service/models/responses/PlayByPlayResponse";
import { Environment } from "../utils/constants";
import { GameFeedEmbedFormatter } from "../utils/EmbedFormatters";
import { EventTypeCode } from "../utils/enums";
import { isGameOver, logDiff } from "../utils/helpers";

const tracked_types = [
    EventTypeCode.goal,
    EventTypeCode.penalty,
    EventTypeCode.periodStart,
    EventTypeCode.periodEnd,
    EventTypeCode.gameEnd,
];

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

    private checkGameStatus = async () => {
        if (this.gameOver) {
            console.log("Game is over, Skipping loop.");
            return;
        }

        const { gameState, awayTeam, homeTeam, clock, periodDescriptor } = await API.Games.GetBoxScore(this.gameId);

        // check if game is over
        if (isGameOver(gameState)) {
            console.log("Ending Game");
            await this.EndGame();
            return;
        }

        // state / iteration unique key
        const stateKey = uniqueId(`${this.gameId}-${periodDescriptor.number}-${clock.timeRemaining}`);

        // log main game loop
        console.log(
            `{${stateKey}} CheckGameStatus - Score: ${awayTeam.commonName.default} ${awayTeam?.score || 0}, ${
                homeTeam.commonName.default
            } ${homeTeam?.score || 0} - ${clock.timeRemaining} - Period ${periodDescriptor.number} - (${gameState})`
        );

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
                switch (play.typeCode) {
                    case EventTypeCode.goal:
                        await this.processGoal(play);
                        break;
                    case EventTypeCode.penalty:
                        await this.processPenalty(play);
                        break;
                    case EventTypeCode.periodStart:
                    case EventTypeCode.periodEnd:
                        await this.processClockEvent(play);
                        break;
                }
            })
        );
        console.log(`{${stateKey}} Finished processing plays: [${plays.map((play) => play.eventId).join(", ")}]`);
        console.log(`{${stateKey}} Tracked events: [${Array.from(this.events.keys()).join(", ")}]`);
    };

    // Maybe we could use https://api-web.nhle.com/v1/gamecenter/2023020204/landing
    // to get the game state and other info? rather than a huge list of plays and parsing them
    // todo - determine delays / performance of each option - does landing mean we don't need to poll for updates, will we get things too delayed?
    private getFeed = async (force: boolean = false): Promise<PlayByPlayResponse> => {
        if (force || !this.feed) {
            const newFeed = await API.Games.GetPlays(this.gameId);
            // first time we're setting feed, mark all previous plays as tracked, but with no message to update
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

    // todo - find a way to patch diffs of new event and previous event?
    // want to avoid heavy processing multiple times -
    // like if the assists change we don't need to re-process the situation code
    private processGoal = async (goal: Play) => {
        const goalEmbed = this.embedFormatter.createGoalEmbed(goal);
        if (!goalEmbed) {
            return;
        }
        return this.createOrUpdatePlayEmbed(goal, goalEmbed);
    };

    private processPenalty = async (penalty: Play) => {
        const penaltyEmbed = this.embedFormatter.createPenaltyEmbed(penalty);
        if (!penaltyEmbed) {
            return;
        }
        return this.createOrUpdatePlayEmbed(penalty, penaltyEmbed);
    };

    private createOrUpdatePlayEmbed = async (play: Play, embed: EmbedBuilder) => {
        const { eventId } = play;
        const messageOpts = { embeds: [embed] };
        if (!this.events.has(eventId)) {
            const message = await this.thread?.send(messageOpts);
            this.events.set(eventId, { message: message, play: play });
            console.log(
                `${eventId} not found in tracked events, created new message for event ${eventId} - ${play.typeDescKey} - ${message.url}`
            );
        } else {
            // try to get the existing message
            const existingMessage = this.events.get(eventId)?.message;
            // the event is already in the feed, update the message
            const newMessage = await existingMessage?.edit(messageOpts);
            // TODO - is this a valid fallback?
            this.events.set(eventId, { message: newMessage ?? existingMessage, play: play });
        }
    };

    private processClockEvent = async (clockEvent: Play) => {
        const { eventId } = clockEvent;
        // exit if we don't have a period descriptor or if it's not a clock event we care about
        switch (clockEvent.typeCode) {
            case EventTypeCode.periodStart:
            case EventTypeCode.periodEnd:
                const existingEmbed = this.events.get(eventId)?.message?.embeds?.[0];
                const intermissionEmbed = existingEmbed
                    ? this.embedFormatter.updateIntermissionEmbed(clockEvent, existingEmbed)
                    : this.embedFormatter.createIntermissionEmbed(clockEvent);

                await this.createOrUpdatePlayEmbed(clockEvent, intermissionEmbed);
                break;
            case EventTypeCode.gameEnd:
                await this.EndGame();
                break;
            default:
                break;
        }
    };

    private EndGame = async () => {
        this.gameOver = true;
        this.events.clear();
        const scoreEmbed = this.embedFormatter.createGameEndEmbed();
        await this?.thread?.send({
            embeds: [scoreEmbed],
        });
        await this?.thread?.setArchived(true, "game over").catch(console.error);
        this.Stop();
    };

    public Stop = () => {
        this.scheduler.stopById(this.gameId);
    };
    public Start = () => {
        return this.scheduler.startById(this.gameId);
    };
    public Status = () => {
        return this.scheduler.getById(this.gameId);
    };
}
