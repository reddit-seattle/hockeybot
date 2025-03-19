import { EmbedBuilder } from "@discordjs/builders";
import { Message, ThreadChannel } from "discord.js";
import { ScheduleOptions, ScheduledTask, schedule } from "node-cron";
import { contains } from "underscore";
import { API } from "../service/API";
import { Play, PlayByPlayResponse } from "../service/models/responses/PlayByPlayResponse";
import { Config, Environment } from "../utils/constants";
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
    private CRON: string = "*/10 * * * * *";

    private taskOptions: ScheduleOptions = { scheduled: true, timezone: Config.TIME_ZONE };

    private task: ScheduledTask;
    private thread: ThreadChannel;
    private gameId: string;
    private feed?: PlayByPlayResponse;
    private embedFormatter: GameFeedEmbedFormatter;
    private gameOver: boolean = false;

    private events: Map<string, PlayMessageContainer> = new Map<string, PlayMessageContainer>();

    constructor(thread: ThreadChannel, feed: PlayByPlayResponse, taskOptions?: ScheduleOptions, cron?: string) {
        this.thread = thread;
        this.gameId = feed.id;
        this.embedFormatter = new GameFeedEmbedFormatter(feed);

        if (taskOptions) {
            this.taskOptions = taskOptions;
        }
        if (cron) {
            this.CRON = cron;
        }
        // start the task
        this.task = schedule(this.CRON, this.checkGameStatus, this.taskOptions);
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


        // log main game loop
        console.log(
            `CheckGameStatus - Score: ${awayTeam.commonName.default} ${awayTeam?.score || 0}, ${homeTeam.commonName.default} ${
                homeTeam?.score || 0
            } - ${clock.timeRemaining} - Period ${periodDescriptor.number} - (${gameState})`
        );

        // map old game event ids
        const trackedEvents = Array.from(this.events.keys());

        // game feed update
        const { plays } = await this.getFeed(true);

        // remove any events that are no longer in the feed
        const newEventIds = plays.map((play) => play.eventId);
        const removedEventIds = trackedEvents.filter((eventId) => !newEventIds.includes(eventId));
        
        // remove them from the tracked events
        for (const eventId of removedEventIds) {
            if (this.events.has(eventId)) {
                const event = this.events.get(eventId);
                // if the event has a message, delete it
                console.log(
                    `Deleting removed event ${eventId} - ${event?.play.typeDescKey} - message link: ${event?.message?.url}`
                );
                await event?.message?.delete();
                this.events.delete(eventId);
            }
        }

        // parse plays once into buckets
        for (const play of plays.filter((play) => tracked_types.includes(play.typeCode))) {
            const { typeCode } = play;
            switch (typeCode) {
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
        }
    };

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
            console.log(`${eventId} not found in tracked events:`);
            console.log(
                Array.from(this.events.values())
                    .map(
                        (event) =>
                            `${event.play.eventId} - ${event.play.typeDescKey} - ${event.message?.url || "no message"} `
                    )
                    .join(", ")
            );
            const message = await this.thread?.send(messageOpts);
            this.events.set(eventId, { message: message, play: play });
            console.log(`Created new message for event ${eventId} - ${play.typeDescKey} - ${message.url}`);
        } else {
            // try to get the existing message
            const existingMessage = this.events.get(eventId)?.message;
            // the event is already in the feed, update the message
            await existingMessage?.edit(messageOpts);
            this.events.set(eventId, { message: existingMessage, play: play });
        }
    };

    private processClockEvent = async (clockEvent: Play) => {
        const { periodDescriptor, eventId } = clockEvent;
        // exit if we don't have a period descriptor or if it's not a clock event we care about
        if (!periodDescriptor || !contains(tracked_types, clockEvent.typeCode)) {
            return;
        }
        switch (clockEvent.typeCode) {
            case EventTypeCode.periodStart:
            case EventTypeCode.periodEnd:
                const existingEmbed = this.events.get(eventId)?.message?.embeds?.[0];
                const intermissionEmbed = !existingEmbed
                    ? this.embedFormatter.createIntermissionEmbed(clockEvent)
                    : this.embedFormatter.updateIntermissionEmbed(clockEvent, existingEmbed);

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
        await this.Stop();
    };

    public Stop = () => {
        return this.task.stop();
    };
    public Start = () => {
        return this.task.start();
    };
    public Status = () => {
        return this.task.getStatus();
    };
}
