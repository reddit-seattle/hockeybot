
import { Client, Guild, Message, TextChannel } from 'discord.js'
import { createServer } from 'http';
import { Help } from './commands/HelpCommands';
import { GetPlayerStats } from './commands/PlayerCommands';
import { GetLastGamesForTeam, GetNextGamesForTeam, GetSchedule, GetScores } from './commands/ScheduleCommands';
import { GetStandings } from './commands/StandingsCommands';
import { GetTeamStats } from './commands/TeamCommands';
import { Command } from './models/Command';
import { Config, Environment, Kraken } from './utils/constants';
import { GetMessageArgs } from './utils/helpers';

import { ScheduledTask } from 'node-cron';

import { CronHelper } from './utils/CronHelper';

const client: Client = new Client();

//load commands

const commands = [
    GetSchedule,
    GetLastGamesForTeam,
    GetNextGamesForTeam,
    GetPlayerStats,
    GetTeamStats,
    GetScores,
    GetStandings,
    Help
].reduce((map, obj) => {
    map[obj.name] = obj;
    return map;
}, {} as { [id: string]: Command });

client.on("message", async (message: Message) => {
    //bad bot
    if (!message.content.startsWith(Config.prefix) || message.author.bot) return;

    //send it
    const args = GetMessageArgs(message);
    const command = commands?.[args?.[0]];
    try {
        command?.execute(message, args)
    }
    catch (e: any) {
        console.dir(e);
        message.react('💩');
    }
});

client.on('ready', async () => {
    console.log(`Logged in as ${client?.user?.tag}!`);
    if (Environment.DEBUG) {
        //try to announce to servers when you go online
        client.guilds.cache.array().forEach((guild: Guild) => {
            const debugChannel = guild.channels.cache.find(channel => channel.name == 'debug') as TextChannel;
            debugChannel?.send("HockeyBot, reporting for duty!");
        });
    }
    initiateCronJobs();
});

// MAIN
if (!Environment.botToken || Environment.botToken == '') {
    console.log(`Please set an environment variable "bot_token" with your bot's token`);
}
else {
    //login and go
    client.login(Environment.botToken);
}

//stupid fix for azure app service containers requiring a response to port 8080
createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('yeet');
    res.end();
}).listen(8080);

const WatchedGames: { [id: string]: ScheduledTask } = {};
const initiateCronJobs = () => {
    CronHelper.Initialize(game => {
        return true; // all games for now since there are so few
    }, true);
    // 9:00 every morning, check for kraken games
   /** Cron.schedule('0 9 * * *', async () => {
        const today = format(new Date(), 'yyyy-mm-dd');
        const schedule = await API.Schedule.GetTeamSchedule(Kraken.TeamId, today);
        const game = schedule?.[0];
        // if we have a game, check it every 10 seconds
        if (game) {
            WatchedGames[game.gamePk]?.destroy();
             // destroy existing schedule if it exists;
            // get game feed and timecode info
            const feed = API.Games.GetGameById(game.gamePk);
            let timeCode = (await feed).metaData.timeStamp;
            WatchedGames[game.gamePk] = Cron.schedule('0/10 * * * * *', async () => {

                // get and flatten all diffs (new events since last timecode)
                const diff = await API.Games.GetGameDiff(game.gamePk, timeCode);
                const allDiffs = reduce(diff,
                    (prevDiff: GameDiffResponse.Diff[], currDiff: GameDiffResponse.DiffContainer) =>
                        prevDiff.concat(currDiff.diff), [] as GameDiffResponse.Diff[]);

                // Get NEW events (assumption is that a goal is an 'ADD' op)
                const adds = allDiffs.filter(diff => diff.op.toLowerCase() == Operation.ADD.toLowerCase());
                console.log("New 'ADD' ops");
                console.dir(adds);

                // Filter only goal events
                const newGoals = adds.filter(diff => diff?.value?.result?.eventTypeId == "GOAL");
                console.log("'ADD' ops: Goals");
                console.dir(newGoals);
                
                // Log each goal description (just to see if we're doing this right)
                console.log('GOALS:')
                each(newGoals, (goal: GameDiffResponse.Diff) => {
                    console.dir(goal?.value?.result?.description);
                    console.dir(goal?.value?.about?.goals);
                });
                
                // line/boxscore updates
                // NEED - timestamp, current time in period, isIntermission(), which period
                const feed = await API.Games.GetGameById(game.gamePk);
                timeCode = feed.metaData.timeStamp;
                const {linescore} = feed.liveData;
                const { currentPeriodTimeRemaining } = linescore;
                const {inIntermission, intermissionTimeRemaining} = linescore.intermissionInfo;
                const gameState = feed?.gameData?.status?.codedGameState;

                // for debug info, log time in period or intermission
                if(inIntermission){
                    console.log(`${intermissionTimeRemaining} remaining in the ${linescore.currentPeriodOrdinal} intermission.`)
                }
                else if (gameState in [
                    GameState.IN_PROGRESS, // general in progress
                    GameState.CRITICAL // nearing end of period with low goal differential (?)
                ]){
                    console.log(`${currentPeriodTimeRemaining} remaining in the ${linescore.currentPeriodOrdinal} period.`);
                }
                else if (gameState in [
                    GameState.ALMOST_FINAL, // finalizing
                    GameState.FINAL,    // legit final
                    GameState.GAME_OVER // last period has ended
                ]) {
                    // End the game and stop this thing if the game is final
                    console.log(`GAME OVER`);
                    const {away, home } = linescore.teams;
                    console.log(`${away.team.name}: ${away.goals}, ${home.team.name}: ${home.goals}`);
                    WatchedGames[game.gamePk]?.stop()?.destroy();
                }


                // if period has ended
                // announce "End of {} period. Score: Kraken: 0, OtherTeam: 0"
                // elseif goalScored()
                //  announce "GOAL! {} scored by {}.  Score: Kraken: 0, OtherTeam: 0"
                // elseif gameEnded()
                //  announce "FINAL! {} scored by {}.  Score: Kraken: 0, OtherTeam: 0"
            },
            {
                timezone: 'America/Los_Angeles',
            })
        }
    }); */
};
