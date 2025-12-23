import { format } from "date-fns";
import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";
import { API } from "../../service/PWHL/API";
import { Config } from "../../utils/constants";
import { optionalDateOption, processLocalizedDateInput } from "../../utils/helpers";
import { PWHLScoresEmbedBuilder } from "../../utils/PWHLEmbedFormatters";

export const GetScores: Command = {
	name: "pwhl-scores",
	description: "Get PWHL game scores",
	slashCommandDescription: new SlashCommandBuilder().addStringOption(optionalDateOption),
	executeSlashCommand: async (interaction) => {
		await interaction.deferReply();

		const dateInput = interaction.options.getString("date", false);
		const adjustedDate = processLocalizedDateInput(dateInput);

		try {
			let games;
			let titleDate: string;

			if (adjustedDate) {
				// Use GetScorebar for live scores
				const allGames = await API.Schedule.GetScorebar(365, 1);
				const targetDate = format(adjustedDate, "yyyy-MM-dd");
				games = allGames.filter((game) => game.GameDateISO8601.startsWith(targetDate));
				titleDate = `Scores for ${format(adjustedDate, Config.TITLE_DATE_FORMAT)}`;
			} else {
				games = await API.Schedule.GetScorebar(1, 1);
				const zonedNow = new Date();
				const todayStr = format(zonedNow, "yyyy-MM-dd");
				games = games.filter((game) => game.GameDateISO8601.startsWith(todayStr));
				titleDate = `Scores for ${format(new Date(), Config.TITLE_DATE_FORMAT)}`;
			}

			if (!games || games.length === 0) {
				await interaction.followUp(
					`No PWHL games ${
						adjustedDate ? `on ${format(adjustedDate, Config.TITLE_DATE_FORMAT)}` : "today"
					} :(`,
				);
				return;
			}

			// Filter to games that have started (status > 1)
			const startedGames = games.filter((game) => parseInt(game.GameStatus) > 1);

			if (startedGames.length === 0) {
				await interaction.followUp("No games have started yet");
				return;
			}

			await interaction.followUp({
				embeds: [await PWHLScoresEmbedBuilder(startedGames, titleDate)],
			});
		} catch (error) {
			await interaction.followUp(`Error fetching scores: ${error}`);
		}
	},
};
