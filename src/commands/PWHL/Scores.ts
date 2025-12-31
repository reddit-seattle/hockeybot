import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
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
		try {
			const dateInput = interaction.options.getString("date", false);
			const adjustedDate = processLocalizedDateInput(dateInput);
			const allGames = await API.Schedule.GetScorebar();
			const titleDate = formatInTimeZone(adjustedDate ?? new Date(), Config.TIME_ZONE, Config.TITLE_DATE_FORMAT);
			const title = `Scores for ${titleDate}`;

			const filteredGames = allGames.filter((game) =>
				game.GameDateISO8601.startsWith(
					formatInTimeZone(adjustedDate ?? new Date(), Config.TIME_ZONE, Config.GAME_DATE_FORMAT),
				),
			);

			if (!filteredGames?.length) {
				await interaction.followUp(`No games ${adjustedDate ? `on ${titleDate}` : "today"} :(`);
				return;
			}
			await interaction.followUp({
				embeds: [await PWHLScoresEmbedBuilder(filteredGames, title)],
			});
		} catch (error) {
			await interaction.followUp(`Error fetching scores: ${error}`);
		}
	},
};
