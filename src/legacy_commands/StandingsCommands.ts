import { SlashCommandBuilder } from "@discordjs/builders";
import { Message, EmbedBuilder, TextChannel } from "discord.js";
import { Command } from "../models/Command";
import { StandingsTypes } from "../models/StandingsTypes";
import { API } from "../service/legacy_API";

const bot_thumbnail_image = `https://i.imgur.com/xHcfK8Q.jpg`;

export const GetStandings: Command = {
	name: 'standings',
    description: 'Get Standings. Standings type optional (`wildCard`, `divisionLeaders`)',
	slashCommandDescription: new SlashCommandBuilder()
		.setName('standings')
		.setDescription('Get NHL standings')
		.addStringOption(option => 
			option
				.setName('type')
				.setDescription('Optional standings type')
				.addChoices(
					{
						name: 'Wild Card',
						value: StandingsTypes.WILDCARD
					},
					{
						name: 'Divisional',
						value: StandingsTypes.DIVISION_LEADERS
					}
				)
		),
	executeSlashCommand: async (interaction) => {
		const standingsArg = interaction.options.getString('type')
        const standings = await API.Standings.GetStandings(standingsArg as StandingsTypes);
		const embed = new EmbedBuilder({
			title: `Standings`,
			description: `${standingsArg ? standingsArg : 'Regular Season By Conference'}`,
			color: 111111,
			footer: {
				text: 'Source: NHL API',
				iconURL: bot_thumbnail_image,
			},
			fields: standings.map(standing => {
                return {
                    name: standingsArg == StandingsTypes.WILDCARD
					? `Conference: ${standing.conference.name}`
					: `Conference: ${standing.conference.name}, Division: ${standing.division.name}`,
                    value: standing.teamRecords.map((teamRecord, i) =>
                        `${i+1}: ${teamRecord.team.name} - ${teamRecord.points} points  (${teamRecord.leagueRecord.wins}-${teamRecord.leagueRecord.losses}-${teamRecord.leagueRecord.ot})`
                    ).join(`\n`)
                }
            })
		});
		interaction.reply({embeds: [embed]});
	}
}

const oldStandingsCommand = async (message: Message, args?: string[]) => {
	const standingsArg = args?.[0];
	const standings = await API.Standings.GetStandings(standingsArg as StandingsTypes);
	
	if(!standings?.[0]) {
		(message.channel as TextChannel).send(`Couldn't find standings${standingsArg ? ` for ${standingsArg}` : '.'}`);
		return;
	}

	// woohoo, hockey!
	const embed = new EmbedBuilder({
		title: `Standings`,
		description: `${standingsArg ? standingsArg : 'Regular Season By Conference'}`,
		color: 111111,
		footer: {
			text: 'Source: NHL API',
			icon_url: bot_thumbnail_image,
		},
		fields: standings.map(standing => {
			return {
				name: standingsArg == StandingsTypes.WILDCARD
				? `Conference: ${standing.conference.name}`
				: `Conference: ${standing.conference.name}, Division: ${standing.division.name}`,
				value: standing.teamRecords.map((teamRecord, i) =>
					`${i+1}: ${teamRecord.team.name} - ${teamRecord.points} points  (${teamRecord.leagueRecord.wins}-${teamRecord.leagueRecord.losses}-${teamRecord.leagueRecord.ot})`
				).join(`\n`)
			}
		})
	});
	(message.channel as TextChannel).send({embeds: [embed]});
};