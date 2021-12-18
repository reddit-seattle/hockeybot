import { Message, MessageEmbed } from "discord.js";
import { Command } from "../models/Command";
import { Config, RoleIds } from "../utils/constants";
import { KillGameCheckerCommand } from "./KrakenCommands";
import { GetPlayerStats } from "./PlayerCommands";
import { GetSchedule, GetLastGamesForTeam, GetNextGamesForTeam, GetScores } from "./ScheduleCommands";
import { GetStandings } from "./StandingsCommands";
import { GetTeamStats } from "./TeamCommands";


const bot_thumbnail_image = `https://i.imgur.com/xHcfK8Q.jpg`;

//TODO - these are duplicated from command-loading in index, let's put this somewhere consistent.
const commands = [
    // schedule, fwd/back
    GetSchedule,
    GetLastGamesForTeam,
    GetNextGamesForTeam,
    // teamstats (meh atm)
    GetTeamStats,
    //playerStats
    GetPlayerStats,
    // scores
    GetScores,
    // standings
    GetStandings,
    // Game Updates
    KillGameCheckerCommand
]


export const Help: Command = {
    name: 'help',
    description: 'Display Hockeybot help',
    async execute(message: Message, args?: string[]) {

        // filter admin commands to only mods
        const filteredCommands = commands.filter(command =>
            !command?.adminOnly ||
            (command?.adminOnly && message.member?.roles.cache.has(RoleIds.MOD))
        );

        const embed = new MessageEmbed({
            title: `Hockeybot Help`,
            description: 'Commands',
            color: 111111,
            fields: filteredCommands.map(command => {
                return {
                    name: command.name,
                    value: `${command.description}\nExample: ${Config.prefix} ${command.help}`,
                    inline: false
                }
            })
        });
        message.channel.send({embeds: [embed]});
    },
}