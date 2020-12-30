
import { Client, Guild, Message, TextChannel } from 'discord.js'
import { createServer } from 'http';
import { GetLastGamesForTeam, GetNextGamesForTeam, GetSchedule } from './commands/ScheduleCommands';
import { Config, Environment } from './utils/constants';
import { GetMessageArgs } from './utils/helpers';

const client: Client = new Client();

client.on("message", async(message: Message) => {
    //bad bot
    if (!message.content.startsWith(Config.prefix) || message.author.bot) return;
    
    const args = GetMessageArgs(message);
    // TODO: dictionary fire commands by commands[CommandModule.name]
    if(message.content.startsWith('$nhl schedule')){
        GetSchedule.execute(message, args);
    }
    else if(message.content.startsWith('$nhl next')){
        GetNextGamesForTeam.execute(message, args);
    }
    else if(message.content.startsWith('$nhl last')){
        GetLastGamesForTeam.execute(message, args);
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
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('yeet');
  res.end();
}).listen(8080);
