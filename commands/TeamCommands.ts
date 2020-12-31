import { Message, MessageEmbed } from "discord.js";
import { Command } from "../models/Command";
import { API } from "../service/API";
import { getProperty } from "../utils/helpers";


const bot_thumbnail_image = `https://i.imgur.com/xHcfK8Q.jpg`;

export const GetTeamStats: Command = {
	name: 'teamstats',
	description: 'Team regular season statistics',
	async execute(message: Message, args: string[]) {
		const team = await API.Teams.GetTeamByAbbreviation(args[1]);
		if(!team?.id) {
			message.channel.send(`Couldn't find stats for team ${args[1]}`);
			return;
		}
		const stats = await API.Stats.TeamStats(team.id);
		// woohoo, hockey!
		const embed = new MessageEmbed({
			title: `${team.teamName} Regular Season Stats`,
			description: 'Stats',
			color: 111111,
			footer: {
				text: 'Source: NHL API',
				iconURL: bot_thumbnail_image,
			},
			// image: {
			// 	url: bot_thumbnail_image,
			// },
			fields: Object.keys(stats).map(key => {
				return {
					name: key,
					value: getProperty(stats, key as any),
					inline: true
				}
			})
		});
		message.channel.send(embed);
	},
}