import { Message, MessageEmbed } from "discord.js";
import { Command } from "../models/Command";
import { API } from "../service/API";
import { getProperty } from "../utils/helpers";

export const GetPlayerStats: Command = {
	name: 'playerstats',
	description: 'PlayerStats',
	help: 'playerstats PHI [lastName | number]',
	async execute(message: Message, args: string[]) {
		const team = await API.Teams.GetTeamByAbbreviation(args[1]);
		if(!team?.id) {
			message.channel.send(`Couldn't find roster for team ${args[1]}`);
			return;
		}
        const players = await API.Teams.GetRoster(team.id);

        const playerArg = args[2];
        if (!playerArg) {
            message.channel.send('No player search info provided. Please provide the team and either a name or jersey number.');
            return;
        }
        const playerNum = parseInt(playerArg); // may be NaN
        //let's get weird and try and pull a player out with whatever the second arg is
        //TODO: Fuzzy Match names
        const playerFilter = players.filter(player => {
            return (!isNaN(playerNum) && parseInt(player.jerseyNumber) == playerNum) ||
            player?.person?.fullName?.split(' ')?.[1] == playerArg  
        })
        const player = playerFilter?.[0];
        if(player) {
            const playerStats = await API.Players.GetPlayerSeasonStats(player.person.id);
            if(playerStats) {
                //try and get player image
                const playerImageUrl = `https://cms.nhl.bamgrid.com/images/headshots/current/168x168/${player.person.id}.jpg`
                const embed = new MessageEmbed({
                    title: `${player.person.fullName} - ${team.abbreviation} ${player.jerseyNumber}`,
                    description: 'Season stats',
                    color: 111111,
                    image: {
                        url: playerImageUrl
                    },
                    fields: Object.keys(playerStats).map(key => {
                        return {
                            name: key,
                            value: getProperty(playerStats, key as any),
                            inline: true
                        }
                    })
                });
                message.channel.send(embed);
            }
            else {
                message.channel.send('error finding stats for this current season');
            }
        }
        else { 

            message.channel.send(`No player found on the ${team.teamName} with name or number matching ${playerArg}`)

        }
	},
}