
import { Client, Guild, Message, TextChannel } from 'discord.js'
import { REST } from '@discordjs/rest';
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from 'discord-api-types/v9';
import { createServer } from 'http';
import { Help } from './commands/HelpCommands';
import { KillGameCheckerCommand, SetupKrakenGameDayChecker } from './commands/KrakenCommands';
import { GetPlayerStats } from './commands/PlayerCommands';
import { GetLastGameRecap, GetLastGamesForTeam, GetNextGamesForTeam, GetSchedule, GetScores } from './commands/ScheduleCommands';
import { GetStandings } from './commands/StandingsCommands';
import { GetTeamStats } from './commands/TeamCommands';
import { Command, CommandDictionary } from './models/Command';
import { ChannelIds, Config, Environment, RoleIds } from './utils/constants';
import { SplitMessageIntoArgs } from './utils/helpers';
import { exit } from 'process';

const client = new Client({
    intents: [
      "GUILDS",
      "GUILD_MESSAGES",
      "GUILD_MESSAGE_REACTIONS",
    ],
  });

//load commands

const commands = [
    GetSchedule,
    GetLastGamesForTeam,
    GetNextGamesForTeam,
    GetPlayerStats,
    GetTeamStats,
    GetScores,
    GetStandings,
    KillGameCheckerCommand,
    GetLastGameRecap,
    Help
].reduce((map, obj) => {
        map[obj.name] = obj;
        return map;
}, {} as CommandDictionary);

const { botToken } = Environment;
// MAIN
if (!botToken || botToken == '') {
    console.log(`Please set an environment variable "bot_token" with your bot's token`);
    exit(1);
}
else {
    //login and go
    client.login(Environment.botToken);
}

//hook up api
const rest = new REST({ version: '9' }).setToken(botToken);

const registerAllSlashCommands = async (client: Client) => {
    client.guilds.cache.forEach(async guild => {
        const slashCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];
        for(const commandName in commands) {
            const command = commands[commandName];
            if(command?.slashCommandDescription) {
                console.log(`adding ${command.name} slash command registration`)
                const desc = command.slashCommandDescription();
                slashCommands.push(desc.toJSON());
            }
        }
        const result = await rest.put(
            Routes.applicationGuildCommands(client.user!.id, guild.id),
            {
                body: slashCommands
            }
        );
        console.dir(result);
    });
}

client.on("messageCreate", async (message: Message) => {
    //bad bot
    if (!message.content.startsWith(Config.prefix) || message.author.bot) return;

    const args = SplitMessageIntoArgs(message);
    //grab actual command and separate it from args
    const commandArg = args?.shift()?.toLowerCase() || '';
    const command = commands?.[commandArg];

    try {
        if(command?.adminOnly && !message.member?.roles.cache.has(RoleIds.MOD)){
            message.channel.send('nice try, loser');
            return;
        }
        else {
            command?.execute(message, args);
        }
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
        client.guilds.cache.forEach((guild: Guild) => {
            const debugChannel = guild.channels.cache.find(ch => ch.id == ChannelIds.DEBUG) as TextChannel;
            debugChannel?.send("HockeyBot, reporting for duty!");
        });
    }
   SetupKrakenGameDayChecker(client);
   registerAllSlashCommands(client);
});

client.on("interactionCreate", async interaction => {
    if(!interaction.isCommand()) return;

    const command = commands?.[interaction.commandName];
    if(command) {
        command.executeSlashCommand?.(interaction);
    };
})

//stupid fix for azure app service containers requiring a response to port 8080
createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('yeet');
    res.end();
}).listen(8080);
