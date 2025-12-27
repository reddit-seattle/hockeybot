import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { format } from "date-fns";
import { Command } from "../../models/Command";
import { API } from "../../service/PWHL/API";
import { Config } from "../../utils/constants";
import { optionalDateOption, processLocalizedDateInput } from "../../utils/helpers";
import { PWHLScheduleEmbedBuilder } from "../../utils/PWHLEmbedFormatters";
import { EmojiCache } from "../../utils/EmojiCache";
import { pwhlTeamAutocomplete } from "../../utils/autocomplete";
import { Logger } from "../../utils/Logger";

const NEXT_GAMES_COUNT = 5;

// TODO - past games need to know to use different season id for fetching games

const teamScheduleSubcommandBuilder = new SlashCommandSubcommandBuilder()
	.setName("team")
	.setDescription("PWHL team schedule")
	.addStringOption((option) =>
		option.setName("team").setDescription("Team code (SEA)").setRequired(true).setAutocomplete(true),
	);

const leagueScheduleSubcommandBuilder = new SlashCommandSubcommandBuilder()
	.setName("all")
	.setDescription("All PWHL games")
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
					await interaction.followUp(`No PWHL team found with code: ${teamInput}`);
					return;
				}

				// Get team schedule and filter to upcoming games
				const schedule = await API.Schedule.GetTeamSchedule(team.id.toString());
				if (!schedule || schedule.length === 0) {
					await interaction.followUp(`No schedule response for ${teamInput} [${team.id}]`);
					return;
				}
				const now = new Date();
				const upcomingGames = schedule
					// Only future games
					.filter((game) => new Date(game.GameDateISO8601) >= now)
					// Sort by date
					.sort((a, b) => new Date(a.GameDateISO8601).getTime() - new Date(b.GameDateISO8601).getTime())
					// Next {X} games
					.slice(0, NEXT_GAMES_COUNT);

				if (upcomingGames.length === 0) {
					await interaction.followUp(`No upcoming games for ${teamInput} [${team.id}]`);
					return;
				}

				const teamEmoji = EmojiCache.getPWHLTeamEmoji(team.code);
				const title = `${teamEmoji ?? ""}${team.name} Schedule`;
				const scheduleEmbed = await PWHLScheduleEmbedBuilder(upcomingGames, title);

				await interaction.followUp({
					embeds: [scheduleEmbed],
				});
			} catch (error) {
				await interaction.followUp("Error fetching team schedule");
				Logger.error("[PWHL] Error fetching team schedule:", error);
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
				const scheduleEmbed = await PWHLScheduleEmbedBuilder(games, titleDate);
				await interaction.followUp({
					embeds: [scheduleEmbed],
				});
			} catch (error) {
				await interaction.followUp("Error fetching schedule");
				Logger.error("[PWHL] Error fetching schedule:", error);
			}
		}
	},
};
