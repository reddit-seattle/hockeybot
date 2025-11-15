import { REST } from "@discordjs/rest";
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord-api-types/v10";
import { ChannelType, Client, Guild, Interaction, SlashCommandBuilder, TextChannel } from "discord.js";
import { createServer } from "http";
import { exit } from "process";
import { Mariners, MLBGameThread, ReplayMLBGame } from "./commands/MLB";
import { GameThread, GetSchedule, GetScores, GetStandings, GetStats, PlayoffBracket, ReplayGame } from "./commands/NHL";
import { CommandDictionary } from "./models/Command";
import { MLBGameScheduleMonitor } from "./service/MLB/tasks/MLBGameScheduleMonitor";
import { NHLGameScheduleMonitor } from "./service/NHL/tasks/NHLGameScheduleMonitor";
import { Environment } from "./utils/constants";
// @ts-ignore
import LogTimestamp from "log-timestamp";
import { mlbScheduleMonitorService } from "./service/MLB/MLBScheduleMonitorService";
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
    MLBGameThread,
    ReplayMLBGame,
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
            const desc = command.slashCommandDescription
                .setName(command.name)
                .setDescription(command.description) as SlashCommandBuilder;
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

const startNHLGameDayThreadChecker = async (guild: Guild) => {
    if (!Environment.GAMEDAY_CHANNEL_ID) {
        Logger.warn("NHL game day channel ID not set. NHL game day thread checker will not start.");
        return;
    }

    const nhlGameDayChannel = await guild.channels.fetch(Environment.GAMEDAY_CHANNEL_ID);
    if (!(nhlGameDayChannel?.type == ChannelType.GuildText)) {
        Logger.warn("NHL game day channel not found or not a text channel.");
        return;
    }

    // Start NHL monitor
    const scheduleMonitor = new NHLGameScheduleMonitor(nhlGameDayChannel, Environment.HOCKEYBOT_TEAM_ID || null);
    scheduleMonitor.initialize();
    scheduleMonitorService.set(scheduleMonitor);
    Logger.info("NHL schedule monitor started");
};

const startMLBGameDayThreadChecker = async (guild: Guild) => {
    if (!Environment.HOCKEYBOT_MLB_CHANNEL_ID) {
        Logger.warn("MLB game day channel ID not set. MLB game day thread checker will not start.");
        return;
    }
    const mlbGameDayChannel = await guild.channels.fetch(Environment.HOCKEYBOT_MLB_CHANNEL_ID);
    if (!(mlbGameDayChannel?.type == ChannelType.GuildText)) {
        Logger.warn("MLB game day channel not found or not a text channel.");
        return;
    }

    // Start MLB monitor
    const mlbScheduleMonitor = new MLBGameScheduleMonitor(
        mlbGameDayChannel as TextChannel,
        Environment.HOCKEYBOT_MLB_TEAM_ID,
    );
    mlbScheduleMonitor.initialize();
    mlbScheduleMonitorService.set(mlbScheduleMonitor);
    Logger.info("MLB schedule monitor started");
};

client.once("ready", async () => {
    Logger.info(`Logged in as ${client?.user?.tag}!`);
    Logger.debug(`Version: ${getPackageVersion()}`);
    client.guilds.cache.forEach((guild: Guild) => {
        startNHLGameDayThreadChecker(guild);
        startMLBGameDayThreadChecker(guild);
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
