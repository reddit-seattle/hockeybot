import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";
import { API } from "../../service/PWHL/API";
import { PWHLStandingsEmbedBuilder } from "../../utils/PWHLEmbedFormatters";

export const GetStandings: Command = {
	name: "pwhl-standings",
	description: "Get PWHL Standings",
	slashCommandDescription: new SlashCommandBuilder().addStringOption((option) =>
		option.setName("season").setDescription("Season ID (default: current season)").setRequired(false),
	),
	executeSlashCommand: async (interaction) => {
		await interaction.deferReply();

		const seasonId = interaction.options.getString("season") || undefined;

		try {
			const standings = await API.Standings.GetStandings(seasonId);

			if (!standings || standings.length === 0) {
				await interaction.followUp("No standings data available");
				return;
			}

			// Sort by rank (already sorted from API, but ensure it)
			const sortedStandings = standings.sort((a, b) => (a.rank || 0) - (b.rank || 0));

			await interaction.followUp({
				embeds: [await PWHLStandingsEmbedBuilder(sortedStandings, "Standings")],
			});
		} catch (error) {
			await interaction.followUp(`Error fetching standings: ${error}`);
		}
	},
};
