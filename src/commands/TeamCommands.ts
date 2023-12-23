import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { Message, } from "discord.js";
import { Command } from "../models/Command";
import { API } from "../service/API";
import { getProperty } from "../utils/helpers";


const bot_thumbnail_image = `https://i.imgur.com/xHcfK8Q.jpg`;

export const GetTeamStats: Command = {
	name: 'teamstats',
	description: 'Team regular season statistics',
	slashCommandDescription: new SlashCommandBuilder()
		.setName('teamstats')
		.setDescription('Team regular season stats (WIP)')
		.addStringOption(option => 
			option
				.setName('team')
				.setDescription('team abbreviation')
				.setRequired(true)
		),
	executeSlashCommand: async (interaction) => {
		const teamAbbreviation = interaction.options.getString('team') ?? undefined;
		if(!teamAbbreviation) {
			interaction.reply(`I need a team abbreviation, buddy`);
		}
		const team = await API.Teams.GetTeamByAbbreviation(teamAbbreviation);
		if(!team?.id) {
			interaction.reply(`Couldn't find stats for team ${teamAbbreviation}`);
			return;
		}
		const stats = await API.Stats.TeamStats(team.id);
		// woohoo, hockey!
		const embed = new EmbedBuilder({
			title: `${team.teamName} Regular Season Stats`,
			description: 'Stats',
			color: 111111,
			footer: {
				text: 'Source: NHL API',
				icon_url: bot_thumbnail_image,
			},
			// image: {
			// 	url: bot_thumbnail_image,
			// },
			fields: Object.keys(stats).map(key => {
				return {
					name: key,
					value: `${getProperty(stats, key as any) || 'N/A'}`,
					inline: true
				}
			})
		});
		interaction.reply({embeds: [embed]});
	}
}

const oldCommand = async (message: Message, args?: string[]) => {
	if(!args?.[0]) {
		message.channel.send(`I need a team abbreviation, buddy`);
	}
	const team = await API.Teams.GetTeamByAbbreviation(args?.[0]);
	if(!team?.id) {
		message.channel.send(`Couldn't find stats for team ${args?.[0]}`);
		return;
	}
	const stats = await API.Stats.TeamStats(team.id);
	// woohoo, hockey!
	const embed = new EmbedBuilder({
		title: `${team.teamName} Regular Season Stats`,
		description: 'Stats',
		color: 111111,
		footer: {
			text: 'Source: NHL API',
			icon_url: bot_thumbnail_image,
		},
		// image: {
		// 	url: bot_thumbnail_image,
		// },
		fields: Object.keys(stats).map(key => {
			return {
				name: key,
				value: `${getProperty(stats, key as any) || 'N/A'}`,
				inline: true
			}
		})
	});
	message.channel.send({embeds: [embed]});
};