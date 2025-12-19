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
				games = await API.Schedule.GetGamesByDate(adjustedDate);
				titleDate = `Scores for ${format(adjustedDate, Config.TITLE_DATE_FORMAT)}`;
			} else {
				games = await API.Schedule.GetTodaysGames();
				titleDate = `Scores for ${format(new Date(), Config.TITLE_DATE_FORMAT)}`;
			}

			if (!games || games.length === 0) {
				await interaction.followUp(
					`No PWHL games ${
						adjustedDate ? `on ${format(adjustedDate, Config.TITLE_DATE_FORMAT)}` : "today"
					} :(`
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
