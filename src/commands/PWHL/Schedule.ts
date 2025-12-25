import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { format } from "date-fns";
import { Command } from "../../models/Command";
import { API } from "../../service/PWHL/API";
import { Config } from "../../utils/constants";
import { optionalDateOption, processLocalizedDateInput } from "../../utils/helpers";
import { PWHLScheduleEmbedBuilder } from "../../utils/PWHLEmbedFormatters";
import { EmojiCache } from "../../utils/EmojiCache";
import { pwhlTeamAutocomplete } from "../../utils/autocomplete";

const teamScheduleSubcommandBuilder = new SlashCommandSubcommandBuilder()
	.setName("team")
	.setDescription("Get PWHL team schedule")
	.addStringOption((option) =>
		option.setName("team").setDescription("Team code (e.g., SEA)").setRequired(true).setAutocomplete(true),
	);

const leagueScheduleSubcommandBuilder = new SlashCommandSubcommandBuilder()
	.setName("all")
	.setDescription("See all PWHL games")
	.addStringOption(optionalDateOption);

export const GetSchedule: Command = {
	name: "pwhl-schedule",
	description: "PWHL Game Schedule",
	slashCommandDescription: new SlashCommandBuilder()
		.addSubcommand(leagueScheduleSubcommandBuilder)
		.addSubcommand(teamScheduleSubcommandBuilder),
	autocomplete: pwhlTeamAutocomplete,
	executeSlashCommand: async (interaction) => {
		await interaction.deferReply();

		const subcommand = interaction.options.getSubcommand();

		if (subcommand === "team") {
			const teamInput = interaction.options.getString("team", true);

			try {
				// Find team by code
				const team = await API.Teams.GetTeamByCode(teamInput);
				if (!team) {
					await interaction.followUp(`Could not find PWHL team with code: ${teamInput}`);
					return;
				}

				// Get team schedule and filter to upcoming games
				const schedule = await API.Schedule.GetTeamSchedule(team.id.toString());
				if (!schedule || schedule.length === 0) {
					await interaction.followUp(`No schedule found for ${team.nickname}`);
					return;
				}

				// Filter to upcoming games and sort by date
				const now = new Date();
				const upcomingGames = schedule
					.filter((game) => new Date(game.GameDateISO8601) >= now)
					.sort((a, b) => new Date(a.GameDateISO8601).getTime() - new Date(b.GameDateISO8601).getTime())
					.slice(0, 5); // Show only next 5 games

				if (upcomingGames.length === 0) {
					await interaction.followUp(`No upcoming games found for ${team.nickname}`);
					return;
				}

				const teamEmoji = EmojiCache.getPWHLTeamEmoji(team.code);
				const title = `${teamEmoji ?? ""}${team.name} Schedule`;

				await interaction.followUp({
					embeds: [await PWHLScheduleEmbedBuilder(upcomingGames, title)],
				});
			} catch (error) {
				await interaction.followUp(`Error fetching team schedule: ${error}`);
			}
		} else if (subcommand === "all") {
			const dateInput = interaction.options.getString("date", false);
			const adjustedDate = processLocalizedDateInput(dateInput);

			try {
				let games;
				let titleDate: string;

				if (adjustedDate) {
					games = await API.Schedule.GetGamesByDate(adjustedDate);
					titleDate = format(adjustedDate, Config.TITLE_DATE_FORMAT);
				} else {
					games = await API.Schedule.GetTodaysGames();
					titleDate = format(new Date(), Config.TITLE_DATE_FORMAT);
				}

				await interaction.followUp({
					embeds: [await PWHLScheduleEmbedBuilder(games, titleDate)],
				});
			} catch (error) {
				await interaction.followUp(`Error fetching schedule: ${error}`);
			}
		}
	},
};
