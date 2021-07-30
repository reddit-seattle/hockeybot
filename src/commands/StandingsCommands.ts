import { Message, MessageEmbed } from "discord.js";
import { Command } from "../models/Command";
import { StandingsTypes } from "../models/StandingsTypes";
import { API } from "../service/API";

const bot_thumbnail_image = `https://i.imgur.com/xHcfK8Q.jpg`;

export const GetStandings: Command = {
	name: 'standings',
    description: 'Get Standings. Standings type optional (`wildCard`, `divisionLeaders`)',
    help: 'standings divisionLeaders',
	async execute(message: Message, args: string[]) {
        const standingsArg = args?.[1];
        const standings = await API.Standings.GetStandings(standingsArg as StandingsTypes);
        
		if(!standings?.[0]) {
			message.channel.send(`Couldn't find standings${standingsArg ? ` for ${standingsArg}` : '.'}`);
			return;
		}

		// woohoo, hockey!
		const embed = new MessageEmbed({
			title: `Standings`,
			description: `${standingsArg ? standingsArg : 'Regular Season By Conference'}`,
			color: 111111,
			footer: {
				text: 'Source: NHL API',
				iconURL: bot_thumbnail_image,
			},
			fields: standings.map(standing => {
                return {
                    name: `Conference: ${standing.conference.name}, Division: ${standing.division.name}`,
                    value: standing.teamRecords.map((teamRecord, i) =>
                        `${i+1}: ${teamRecord.team.name} - ${teamRecord.points} points  (${teamRecord.leagueRecord.wins}-${teamRecord.leagueRecord.losses}-${teamRecord.leagueRecord.ot})`
                    ).join(`\n`)
                }
            })
		});
		message.channel.send({embeds: [embed]});
	},
}