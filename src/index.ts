import { REST } from "@discordjs/rest";
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord-api-types/v10";
import { ChannelType, Client, Guild, Interaction, SlashCommandBuilder } from "discord.js";
import { createServer } from "http";
import { exit } from "process";
import { Mariners } from "./commands/MLB";
import { GetSchedule, GetScores, GetStandings, GetStats, PlayoffBracket, ReplayGame, GameThread } from "./commands/NHL";
import { CommandDictionary } from "./models/Command";
import { GameScheduleMonitor } from "./service/NHL/tasks/GameScheduleMonitor";
import { Environment } from "./utils/constants";
// @ts-ignore
import LogTimestamp from "log-timestamp";
import { scheduleMonitorService } from "./service/NHL/ScheduleMonitorService";
import { EmojiCache } from "./utils/EmojiCache";
import { getPackageVersion } from "./utils/helpers";
import { Logger } from "./utils/Logger";

if (Environment.LOCAL_RUN) {
    LogTimestamp();
}

const client = new Client({
    intents: ["Guilds", "GuildMessages", "GuildMessageReactions"],
});

//load commands
const commands = [
    GetSchedule, // NHL commands
    GetScores,
    GetStats,
    GetStandings,
    PlayoffBracket,
    ReplayGame,
    GameThread,
    Mariners, // MLB commands
].reduce((map, obj) => {
    map[obj.name] = obj;
    return map;
}, {} as CommandDictionary);

const { botToken } = Environment;
// MAIN
if (!botToken || botToken == "") {
    Logger.error(`Please set an environment variable "bot_token" with your bot's token`);
    exit(1);
} else {
    //login and go
    client.login(Environment.botToken);
}

//hook up api
const rest = new REST({ version: "10" }).setToken(botToken);

const registerAllSlashCommands = async (client: Client) => {
    (await client.guilds.fetch()).forEach(async (guild) => {
        const slashCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];
        for (const commandName in commands) {
            const command = commands[commandName];
            Logger.debug(`adding ${command.name} slash command registration`);
            const desc = command.slashCommandDescription.setName(command.name).setDescription(command.description) as SlashCommandBuilder;
            if (command.adminOnly) {
                desc.setDefaultMemberPermissions(0);
            }
            if (desc?.toJSON) {
                try {
                    const description = desc.toJSON();
                    slashCommands.push(description);
                } catch (e: any) {
                    console.dir(desc);
                    console.dir(e);
                }
            }
        }
        const result = await rest.put(Routes.applicationGuildCommands(client.user!.id, guild.id), {
            body: slashCommands,
        });
        console.dir(result);
    });
};

const startGameDayThreadChecker = async (guild: Guild) => {
    if (!Environment.GAMEDAY_CHANNEL_ID) {
        Logger.warn("Game day channel ID not set. Game day thread checker will not start.");
        return;
    }

    const gameDayChannel = await guild.channels.fetch(Environment.GAMEDAY_CHANNEL_ID);
    if (!(gameDayChannel?.type == ChannelType.GuildText)) {
        Logger.warn("Game day channel not found or not a text channel.");
        return;
    }

    const scheduleMonitor = new GameScheduleMonitor(
        gameDayChannel,
        Environment.HOCKEYBOT_TEAM_ID || null
    );
    scheduleMonitor.initialize();

    // Store in service instead of global variable
    scheduleMonitorService.set(scheduleMonitor);

    Logger.info("Game schedule monitor started");
};

client.once("ready", async () => {
    Logger.info(`Logged in as ${client?.user?.tag}!`);
    Logger.debug(`Version: ${getPackageVersion()}`);
    client.guilds.cache.forEach((guild: Guild) => {
        // start the game day thread checker for this guild
        startGameDayThreadChecker(guild);
    });
    // keep this out of the loop, this actually loops through guilds
    registerAllSlashCommands(client);
    // Initialize emoji cache
    await EmojiCache.initialize(client);
});

client.on("interactionCreate", async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = commands?.[interaction.commandName];
        if (command) {
            try {
                command.executeSlashCommand?.(interaction);
            } catch (e) {
                Logger.error(e);
            }
        }
    } else if (interaction.isAutocomplete()) {
        const command = commands?.[interaction.commandName];
        if (command?.autocomplete) {
            command.autocomplete(interaction);
        }
    }
});

//stupid fix for azure app service containers requiring a response to port 8080
createServer(function (req, res) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("FERDA");
    res.write("- Hockeybot v" + getPackageVersion() + "\n");
    res.write("tell burn I said hi" + "\n");
    res.end();
}).listen(8080);
