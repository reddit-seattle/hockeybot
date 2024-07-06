
import { Client, Guild, Channel, TextChannel, Interaction } from 'discord.js'
import { REST } from '@discordjs/rest';
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from 'discord-api-types/v10';
import { createServer } from 'http';
// import { KillGameCheckerCommand, SetupKrakenGameDayChecker } from './commands/KrakenCommands';
import { CommandDictionary } from './models/Command';
import { ChannelIds, Environment } from './utils/constants';
import { exit } from 'process';

import { GetStandings, GetScores, GetSchedule, GetStats } from './commands';

const client = new Client({
    intents: [
      "Guilds",
      "GuildMessages",
      "GuildMessageReactions",
    ],
  });

//load commands

const commands = [
    GetSchedule,
    GetScores,
    GetStats,
    GetStandings
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
const rest = new REST({ version: '10' }).setToken(botToken);

const registerAllSlashCommands = async (client: Client) => {
    client.guilds.cache.forEach(async (guild: Guild) => {
        const slashCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];
        for(const commandName in commands) {
            const command = commands[commandName];
            console.log(`adding ${command.name} slash command registration`)
            const desc = command.slashCommandDescription
                .setName(command.name)
                .setDescription(command.description);
            if(desc?.toJSON) {
                try {
                    const description = desc.toJSON();
                    slashCommands.push(description);
                }
                catch(e: any) {
                    console.dir(desc);
                    console.dir(e);
                }
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

client.on('ready', async () => {
    console.log(`Logged in as ${client?.user?.tag}!`);
    if (Environment.DEBUG) {
        //try to announce to servers when you go online
        client.guilds.cache.forEach((guild: Guild) => {
            const debugChannel = guild.channels.cache.find((ch: Channel) => ch.id == ChannelIds.DEBUG) as TextChannel;
            debugChannel?.send("HockeyBot, reporting for duty!");
        });
    }
   registerAllSlashCommands(client);
});

client.on("interactionCreate", async (interaction: Interaction) => {
    if(interaction.isChatInputCommand()) {
    const command = commands?.[interaction.commandName];
    if(command) {
        command.executeSlashCommand?.(interaction);
    };
    }
    else if (interaction.isAutocomplete()) {
        const command = commands?.[interaction.commandName];
        if(command?.autocomplete) {
            command.autocomplete(interaction);
        };
    }

})

//stupid fix for azure app service containers requiring a response to port 8080
createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('FERDA');
    res.end();
}).listen(8080);
