import { schedule, ScheduledTask } from "node-cron";
import { contains, filter } from "underscore";
import { GameStates, Kraken } from "../utils/constants";
import { API } from "../service/API";
import { ApiDateString, isGameOver, periodToStr } from "../utils/helpers";
import { Client, TextChannel, ThreadChannel } from "discord.js";
import { EmbedBuilder } from "@discordjs/builders";
import { Game } from "../service/models/responses/DaySchedule";

let gameId: string;

let ten_minutes = "*/10 * * * *";
let every_morning = "0 0 9 * * *";
let ten_seconds = "*/10 * * * * *";

const startedStates = [GameStates.PRE_GAME, GameStates.IN_PROGRESS, GameStates.CRITICAL];


class GameThreadManager {
    // TODO - do we need this?
    private client: Client;
    private channel: TextChannel;
    private thread: ThreadChannel | undefined;

    public async initialize() {
        console.log("--------------------------------------------------");
        console.log("Calling initialize...");
        console.log("--------------------------------------------------");
        // check if the game is on today
        if (!(await this?.checkDailyForKrakenGame())) {
            // if not, start the daily checker
            console.log("--------------------------------------------------");
            console.log("No game today, starting game checker...");
            console.log("--------------------------------------------------");
            await this?.dailyGameChecker.start();
        }
    }

    constructor(client: Client, channel: TextChannel) {
        this.client = client;
        this.channel = channel;
        this.thread = undefined
    }

    // #region pregame
    private checkForGameStart = async () => {
        console.log("--------------------------------------------------");
        console.log("Checking for game start...");
        console.log("--------------------------------------------------");
        //check if the game has started yet
        const game = await API.Games.GetBoxScore(gameId);
        const { gameState, gameDate } = game;

        if (contains(startedStates, gameState)) {
            // yuh the game is starting (or has started)
            // log everything because this shit is exhausting
            const { awayTeam, homeTeam } = game;
            console.log("--------------------------------------------------");
            console.log(`PREGAME STARTED FOR ID: ${gameId}, (${awayTeam.abbrev} at ${homeTeam.abbrev}) @ ${gameDate}`);
            console.log("--------------------------------------------------");
            // spawn a live game feed checker
            this?.liveGameChecker.start();
            // announce to channel
        }
        if (isGameOver(gameState)) { 
            // the game is over
            this?.liveGameChecker?.stop();
            this?.pregameChecker?.stop();
        }

    };

    private pregameChecker: ScheduledTask = schedule(ten_minutes, this?.checkForGameStart, {
        scheduled: false,
        timezone: "America/Los_Angeles",
    });

    // #endregion

    // #region daily check for kraken game
    private checkDailyForKrakenGame = async () => {
        console.log("--------------------------------------------------");
        console.log("Checking for kraken game today...");
        console.log("--------------------------------------------------");
        const games = await API.Schedule.GetDailySchedule();
        const krakenGames = games?.filter(game => game.homeTeam.id == Kraken.TeamId || game.awayTeam.id == Kraken.TeamId);
        if (krakenGames.length > 0) { 
            const game = krakenGames[0];
            const { awayTeam, homeTeam, startTimeUTC, id } = game;
            console.log("--------------------------------------------------");
            console.log(`KRAKEN GAME TODAY: ${id}, (${awayTeam.abbrev} at ${homeTeam.abbrev}) @ ${startTimeUTC}`);
            console.log("--------------------------------------------------");

            // try to stop it if it's still running for some reason
            this?.pregameChecker?.stop();

            const embed = new EmbedBuilder().setTitle("Kraken Game Day").addFields([
                {
                    name: `${awayTeam.abbrev} at ${homeTeam.abbrev}`,
                    value: game.venue.default,
                },
            ]);
            const threadTitle = generateThreadTitle(game);
            // check for existing thread (in case we had an oopsies)
            const {threads} = await (await (await this.channel.fetch(true)).threads.fetchActive());
            this.thread = threads.filter(thread => thread.name == threadTitle).first();
            if (!this.thread) {
                // announce to channel
                const message = await this.channel.send({ embeds: [embed] });
                // create thread (title is imperative)
                // TODO - this might be fun when next season split-squads happen
                this.thread = await this.channel.threads.create({
                    name: threadTitle,
                    reason: "Creating Kraken Game Day Thread",
                    startMessage: message,
                });
                console.log("--------------------------------------------------");
                console.log(`CREATED THREAD: ${this.thread.id}`);
                console.log("--------------------------------------------------");
            }
            // start checking for pregame
            this?.pregameChecker.start();
            return true;
        }
        return false;
    };


    private dailyGameChecker: ScheduledTask = schedule(every_morning, this?.checkDailyForKrakenGame, {
        scheduled: true,
        timezone: "America/Los_Angeles",
    });
    // #endregion

    // #region live game feed

    // TODO - add a store for previous game state
    // TODO - compare prev / new game state for:
    // - score changes
    // - period change
    // - intermission on/off
    private checkGameStatus = async () => {
        // stop the pregame checker
        this?.pregameChecker?.stop();
        const game = await API.Games.GetBoxScore(gameId);
        const { gameState, gameDate, clock, awayTeam, homeTeam, period, periodDescriptor } = game;
        if (isGameOver(gameState)) { 
            // the game is over
            this?.liveGameChecker?.stop();
            await this.thread?.send("The game is over!");
            await this.thread?.send(`Score: ${awayTeam.name.default} ${awayTeam.score}, ${homeTeam.name.default} ${homeTeam.score}`);
            await this.thread?.setArchived(true, 'game over').catch(console.error);
            return;
        }
        if (clock.inIntermission)
        {
            return;
        }

        console.log(`LIVE GAME FEED CHECKER FOR ID: ${gameId}, (${awayTeam.abbrev} at ${homeTeam.abbrev}) @ ${gameDate}`);
        console.dir(game);
        console.log("--------------------------------------------------");
        console.log(`Score: ${awayTeam.name.default} ${awayTeam.score}, ${homeTeam.name.default} ${homeTeam.score}`);
        console.log("--------------------------------------------------");

        await this?.thread?.send(`${clock.timeRemaining} ${periodToStr(periodDescriptor.number, periodDescriptor.periodType)}`);
    };

    private liveGameChecker: ScheduledTask = schedule(ten_seconds, this?.checkGameStatus, {
        scheduled: false,
        timezone: "America/Los_Angeles",
    });
    // #endregion

}

const generateThreadTitle = (game: Game) => {
    const { awayTeam, homeTeam, startTimeUTC } = game;
    const teamSegment = `${awayTeam.abbrev} @ ${homeTeam.abbrev}`;
    const date = new Date(startTimeUTC);
    const dateStr = ApiDateString(date);
    return `${teamSegment} - ${dateStr}`;
}

export default GameThreadManager;