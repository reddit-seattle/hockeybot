import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";
import { API } from "../../service/PWHL/API";
import { PWHLStandingsEmbedBuilder } from "../../utils/PWHLEmbedFormatters";

export const GetStandings: Command = {
	name: "pwhl-standings",
	description: "Get PWHL Standings",
	slashCommandDescription: new SlashCommandBuilder(),
	executeSlashCommand: async (interaction) => {
		await interaction.deferReply();

		try {
			const standings = await API.Standings.GetStandings();
			if (!standings || standings.length === 0) {
				await interaction.followUp("No standings data available");
				return;
			}
			const sortedStandings = standings.sort((a, b) => (a.rank || 0) - (b.rank || 0));
			await interaction.followUp({
				embeds: [await PWHLStandingsEmbedBuilder(sortedStandings, "Standings")],
			});
		} catch (error) {
			await interaction.followUp(`Error fetching standings: ${error}`);
		}
	},
};
