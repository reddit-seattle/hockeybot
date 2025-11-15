import { EmbedBuilder } from "@discordjs/builders";
import { SlashCommandBuilder } from "discord.js";
import _ from "underscore";
import { Command } from "../../models/Command";
import { API } from "../../service/NHL/API";
import { Standing } from "../../service/NHL/models/DefaultStandingsResponse";
import { EmojiCache } from "../../utils/EmojiCache";
import { ConferenceAbbrev, DivisionAbbrev } from "../../utils/enums";
import { requiredConferenceOption, requiredDivisionOption } from "../../utils/helpers";

export const GetStandings: Command = {
	name: "standings",
	description: "Get NHL Standings",
	slashCommandDescription: new SlashCommandBuilder()
		.addSubcommand((cmd) =>
			cmd.setName("division").setDescription("Division Standings").addStringOption(requiredDivisionOption),
		)
		.addSubcommand((cmd) =>
			cmd.setName("conference").setDescription("Conference Standings").addStringOption(requiredConferenceOption),
		)
		.addSubcommand((cmd) => cmd.setName("wildcard").setDescription("Wildcard Standings")),

	async executeSlashCommand(interaction) {
		await interaction.deferReply();
		const standings = await API.Standings.GetStandings();
		const subcommand = interaction.options.getSubcommand(true);
		// if(subcommand == 'league') {
		//     // all standings
		// }
		if (subcommand == "conference") {
			// standings by single conference
			const conference = interaction.options.getString("conference", true);
			const sortedStandings = standings
				.filter((standing) => standing.conferenceAbbrev == conference)
				.sort((a, b) => a.conferenceSequence - b.conferenceSequence);

			const title = `${conference === "E" ? "Eastern" : "Western"} conference standings`;
			const fields = sortedStandings.map((standing, idx) => {
				const { teamAbbrev } = standing;
				const emoji = EmojiCache.getNHLTeamEmoji(teamAbbrev.default);
				const teamDescriptor = `${idx + 1}: ${emoji} **${teamAbbrev.default}**`;
				return {
					name: teamDescriptor,
					value: buildTeamStandingString(standing),
				};
			});
			await interaction.followUp({
				embeds: [new EmbedBuilder().setTitle(title).addFields(fields)],
			});
		} else if (subcommand == "division") {
			// standings by single division
			const division = interaction.options.getString("division", true);
			const sortedStandings = standings
				.filter((standing) => standing.divisionAbbrev == division)
				.sort((a, b) => a.divisionSequence - b.divisionSequence);

			const divisionNameMap: { [key: string]: string } = {
				[DivisionAbbrev.atlantic]: "Atlantic",
				[DivisionAbbrev.central]: "Central",
				[DivisionAbbrev.metro]: "Metro",
				[DivisionAbbrev.pacific]: "Pacific",
			};
			const title = `${divisionNameMap[division]} division standings`;
			const fields = sortedStandings.map((standing, idx) => {
				const { teamAbbrev } = standing;
				const emoji = EmojiCache.getNHLTeamEmoji(teamAbbrev.default);
				const teamDescriptor = `${idx + 1}: ${emoji} **${teamAbbrev.default}**`;
				return {
					name: teamDescriptor,
					value: buildTeamStandingString(standing),
				};
			});
			await interaction.followUp({
				embeds: [new EmbedBuilder().setTitle(title).addFields(fields)],
			});
		} else if (subcommand == "wildcard") {
			const eastern = standings
				.filter((standing) => standing.conferenceAbbrev == ConferenceAbbrev.eastern)
				.sort(wildcardSort);

			const western = standings
				.filter((standing) => standing.conferenceAbbrev == ConferenceAbbrev.western)
				.sort(wildcardSort);

			const easternPlayoffs = _.first(eastern, 8);
			const westernPlayoffs = _.first(western, 8);

			const eastWildcardRace = eastern.slice(8);
			const westWildcardRace = western.slice(8);

			const title = "Wildcard standings";
			const fields = [
				{
					name: "**Eastern Playoffs**",
					value: easternPlayoffs
						.map((standing, idx) => {
							const pos = idx >= 6 ? `WC${idx - 5}` : `${idx + 1}`;
							return `\`${pos.padEnd(3)}\` ${buildWildcardString(standing)}`;
						})
						.join("\n"),
					inline: false,
				},
				{
					name: "**Eastern Wildcard**",
					value:
						eastWildcardRace.length > 0
							? eastWildcardRace
									.map((standing) => {
										return `${buildWildcardString(standing)}`;
									})
									.join("\n")
							: "No teams in wildcard race",
					inline: false,
				},
				{
					name: "**Western Playoffs**",
					value: westernPlayoffs
						.map((standing, idx) => {
							const pos = idx >= 6 ? `WC${idx - 5}` : `${idx + 1}`;
							return `\`${pos.padEnd(3)}\` ${buildWildcardString(standing)}`;
						})
						.join("\n"),
					inline: false,
				},
				{
					name: "**Western Wildcard**",
					value:
						westWildcardRace.length > 0
							? westWildcardRace
									.map((standing) => {
										return `${buildWildcardString(standing)}`;
									})
									.join("\n")
							: "No teams in wildcard race",
					inline: false,
				},
			];

			await interaction.followUp({
				embeds: [new EmbedBuilder().setTitle(title).addFields(fields)],
			});
		}
	},
};

const wildcardSort = (a: Standing, b: Standing) => {
	return a.conferenceSequence - b.conferenceSequence || a.wildcardSequence - b.wildcardSequence;
};

const buildWildcardString = (standing: Standing) => {
	const { teamAbbrev, points, gamesPlayed, divisionAbbrev, divisionSequence } = standing;

	const emoji = EmojiCache.getNHLTeamEmoji(teamAbbrev.default);
	const divisionDescriptor = `(${divisionAbbrev}${divisionSequence})`;
	return `${emoji} **${teamAbbrev.default}** - ${points} pts - ${gamesPlayed} GP - ${divisionDescriptor}`;
};

const buildTeamStandingString = (standing: Standing) => {
	const { points, wins, losses, otLosses, streakCode, streakCount, l10Wins, l10Losses, l10OtLosses } = standing;

	const record = `${wins}-${losses}-${otLosses}`;
	const l10 = `L10: (${l10Wins}-${l10Losses}-${l10OtLosses})`;
	const streak = `streak ${streakCount}${streakCode}`;

	return `${points} pts - (${record}) - ${l10} - ${streak}`;
};
