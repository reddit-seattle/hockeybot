import { EmbedBuilder } from "@discordjs/builders";
import { SlashCommandBuilder } from "discord.js";
import _ from "underscore";
import { Command } from "../../models/Command";
import { API } from "../../service/NHL/API";
import { Standing } from "../../service/NHL/models/DefaultStandingsResponse";
import { ConferenceAbbrev } from "../../utils/enums";
import { requiredConferenceOption, requiredDivisionOption } from "../../utils/helpers";

/**
 * TODO
 * Standings
 * By League, Conference, Division, wildcard
 */
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
		// .addSubcommand(cmd =>
		//     cmd
		//         .setName('league')
		//         .setDescription('League Standings')
		// )
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
				.sort((standing) => standing.conferenceSequence);

			const title = `${conference === "E" ? "Eastern" : "Western"} conference standings`;
			const fields = sortedStandings.map((standing, idx) => {
				const { teamAbbrev, teamName } = standing;
				const teamDescriptor = `${idx + 1}: [${teamAbbrev.default}] ${teamName.default}`;
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
				.sort((standing) => standing.divisionSequence);
			const div = standings[0].divisionName;
			const title = `${div} division standings`;
			const fields = sortedStandings.map((standing, idx) => {
				const { teamAbbrev, teamName } = standing;
				const teamDescriptor = `${idx + 1}: [${teamAbbrev.default}] ${teamName.default}`;
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

			const eastWildcardRace = eastern.filter((standing) => standing.wildcardSequence > 2);
			const westWildcardRace = western.filter((standing) => standing.wildcardSequence > 2);

			const title = "Wildcard standings";
			const fields = [
				{
					name: "Eastern Playoffs",
					value: easternPlayoffs
						.map((standing, idx) => {
							const pos = idx > 5 ? `WC${idx - 5}` : idx + 1;
							return `${pos}: ${buildWildcardString(standing)}`;
						})
						.join("\n"),
				},
				{
					name: "Eastern Wildcard",
					value: eastWildcardRace
						.map((standing) => {
							return `${buildWildcardString(standing)}`;
						})
						.join("\n"),
				},
				{
					name: "Western Playoffs",
					value: westernPlayoffs
						.map((standing, idx) => {
							const pos = idx > 5 ? `WC${idx - 5}` : idx + 1;
							return `${pos}: ${buildWildcardString(standing)}`;
						})
						.join("\n"),
				},
				{
					name: "Western Wildcard",
					value: westWildcardRace
						.map((standing) => {
							return `${buildWildcardString(standing)}`;
						})
						.join("\n"),
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
	const {
		teamAbbrev,
		teamName,
		points, // (82 pts [.500])
		gamesPlayed,
		divisionAbbrev,
		divisionSequence,
	} = standing;

	const teamDescriptor = `${teamAbbrev.default}`;
	const divisionDescriptor = `(${divisionAbbrev}${divisionSequence})`;
	return `${teamDescriptor} - ${points} pts - ${gamesPlayed} GP - ${divisionDescriptor}`;
};

const buildTeamStandingString = (standing: Standing) => {
	const {
		points,
		pointPctg, // (82 pts [.500])
		wins,
		losses,
		otLosses, // (W-L-OTL)
		streakCode,
		streakCount, // W2
		l10Wins,
		l10Losses,
		l10OtLosses, // (L10)
	} = standing;

	const pointsDescriptor = `${points} pts`;
	const record = `(${wins}-${losses}-${otLosses})`;
	const l10 = `(${l10Wins}-${l10Losses}-${l10OtLosses})`;
	const streak = `${streakCount}${streakCode}`;

	return `${pointsDescriptor} - ${record} - L10: ${l10} - streak ${streak}`;
};
