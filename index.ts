
import { Client, Guild, Message, TextChannel } from 'discord.js'
import { createServer } from 'http';
import { Help } from './commands/HelpCommands';
import { GetLastGamesForTeam, GetNextGamesForTeam, GetSchedule, GetScores } from './commands/ScheduleCommands';
import { GetStandings } from './commands/StandingsCommands';
import { GetTeamStats } from './commands/TeamCommands';
import { Command } from './models/Command';
import { Config, Environment } from './utils/constants';
import { GetMessageArgs } from './utils/helpers';

const client: Client = new Client();

//load commands

const commands = [
    GetSchedule,
    GetLastGamesForTeam,
    GetNextGamesForTeam,
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
    try{
        command?.execute(message, args)
    }
    catch(e: any) {
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
