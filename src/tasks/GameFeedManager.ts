import { Message, MessageCreateOptions, MessageEditOptions, ThreadChannel } from "discord.js";
import { mkdirSync, writeFileSync } from "fs";
import { ScheduleOptions, ScheduledTask, schedule } from "node-cron";
import { any, contains } from "underscore";
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

/**
 * TODO - announce challenges / goal removals / unsuccessful challenges? / GOALIE PULLS / RUNS
 *
 * {
 *     "eventId": 39,
 *     "periodDescriptor": {
 *       "number": 2,
 *       "periodType": "REG",
 *       "maxRegulationPeriods": 3
 *     },
 *     "timeInPeriod": "15:26",
 *     "timeRemaining": "04:34",
 *     "situationCode": "1451",
 *     "homeTeamDefendingSide": "right",
 *     "typeCode": 516,
 *     "typeDescKey": "stoppage",
 *     "sortOrder": 478,
 *     "details": {
 *       "reason": "chlg-hm-off-side",
 *       "secondaryReason": "chlg-hm-off-side"
 *     }
 *   }
 */

export class GameFeedManager {
    private CRON: string = "*/10 * * * * *";

    private taskOptions: ScheduleOptions = { scheduled: true, timezone: Config.TIME_ZONE };

    private task: ScheduledTask;
    private thread: ThreadChannel;
    private gameId: string;
    private feed?: PlayByPlayResponse;
    private embedFormatter: GameFeedEmbedFormatter;

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
        const game = await API.Games.GetBoxScore(this.gameId);
        const { gameState, awayTeam, homeTeam, clock, period } = game;

        // log main game loop
        console.log(
            `Score: ${awayTeam.commonName.default} ${awayTeam?.score || 0}, ${homeTeam.commonName.default} ${
                homeTeam?.score || 0
            } - ${clock.timeRemaining} - Period ${period}`
        );

        // map old game event ids
        const oldEventIds = Array.from(this.events.keys());

        // game feed update
        const feed = await this.getFeed(true);

        const { plays } = feed;

        // remove any events that are no longer in the feed
        const newEventIds = plays.map((play) => play.eventId);
        const removedEvents = oldEventIds.filter((eventId) => !newEventIds.includes(eventId));
        // remove them from the tracked events
        for (const eventId of removedEvents) {
            const event = this.events.get(eventId);
            if (event) {
                // if the event has a message, delete it
                console.log(
                    `Deleting removed event ${eventId} - ${event.play.typeDescKey} - message link: ${event.message?.url}`
                );
                event?.message?.delete();
                this.events.delete(eventId);
            }
        }

        // check if game is over
        if (isGameOver(gameState)) {
            console.log("Game is over, stopping feed updates.");
            await this.EndGame();
            return;
        }

        // parse plays once into buckets
        for (const play of plays) {
            const { typeCode } = play;
            // skip if it's not an event we care about
            if (!tracked_types.includes(typeCode)) {
                continue;
            }
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
                default:
                    break;
            }
        }
        console.log(`Tracked events after processing: `);
        console.log(Array.from(this.events.values()).map(event => `${event.play.eventId} - ${event.play.typeDescKey} - message link: ${event.message?.url ?? "undefined"}`));
    };

    private getFeed = async (force: boolean = false): Promise<PlayByPlayResponse> => {
        if (force || !this.feed) {
            const feed = await API.Games.GetPlays(this.gameId);
            // first time we're setting feed, log all plays we are about
            if (!this.feed) {
                for (const play of feed.plays) {
                    if (tracked_types.includes(play.typeCode)) {
                        this.events.set(play.eventId, { message: undefined, play: play });
                    }
                }
            }
            // log the diff of the plays
            const diff = logDiff(this.feed?.plays || [], feed.plays);

            // if there are any changes, log the diff to a file (for local run only)
            if (Environment.LOCAL_RUN && any([...diff.added, ...diff.updated, ...diff.removed])) {
                const outputDir = `./output/${this.gameId}`;
                //  create the directory if it doesn't exist
                mkdirSync(outputDir, { recursive: true });
                // write the diff to a file with current timestamp
                const timestamp = new Date().toLocaleTimeString().replace(/:/g, "-");
                const fileName = `${outputDir}/${timestamp}.json`;
                // write the diff to a file
                writeFileSync(fileName, JSON.stringify(diff, null, 2));
            }
            // update the feed
            this.feed = feed;
            this.embedFormatter.updateFeed(feed);
        }
        return this.feed;
    };

    // todo - find a way to patch diffs of new event and previous event?
    // want to avoid heavy processing multiple times -
    // like if the assists change we don't need to re-process the situation code
    private processGoal = async (goal: Play) => {
        const embed = await this.embedFormatter.createGoalEmbed(goal);
        if (!embed) {
            return;
        }
        await this.createOrUpdateEventMessage(goal, { embeds: [embed] });
    };

    private processPenalty = async (penalty: Play) => {
        const penaltyEmbed = await this.embedFormatter.createPenaltyEmbed(penalty);
        if (!penaltyEmbed) {
            return;
        }
        await this.createOrUpdateEventMessage(penalty, { embeds: [penaltyEmbed] });
    };

    private createOrUpdateEventMessage = async (play: Play, messageOpts: MessageCreateOptions | MessageEditOptions) => {
        const { eventId } = play;
        const event = this.events.get(eventId);
        const { message: existingMessage } = event ?? {};
        let message: Message | undefined;
        if (!event?.play?.eventId) {
            // announce new event
            message = await this.thread?.send(messageOpts as MessageCreateOptions);
            console.log(`Created new message for event ${eventId} - ${play.typeDescKey} - ${message.url}`);
        } else if (existingMessage) {
            // the event is already in the feed, update the message
            message = await existingMessage?.edit(messageOpts as MessageEditOptions);
            console.log( `Updating message for event ${eventId} - ${play.typeDescKey} - message: ${existingMessage.url}`);
        }
        // update the local event object
        this.events.set(eventId, { message, play });
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
                const event = this.events.get(eventId);
                const existingEmbed = event?.message?.embeds?.[0];

                const scoreEmbed = !existingEmbed
                    ? ({
                          embeds: [await this.embedFormatter.createIntermissionEmbed(clockEvent)],
                      } as MessageCreateOptions)
                    : await this.embedFormatter.updateIntermissionEmbed(clockEvent, existingEmbed);

                await this.createOrUpdateEventMessage(clockEvent, scoreEmbed);
                break;
            case EventTypeCode.gameEnd:
                await this.EndGame();
                break;
            default:
                break;
        }
    };

    private EndGame = async () => {
        // force an update to get end of game details
        // TODO - might have to wait for a final final state
        await this.getFeed(true);
        const scoreEmbed = await this.embedFormatter.createGameEndEmbed();
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
