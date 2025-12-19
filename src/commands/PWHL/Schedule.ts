import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { format } from "date-fns";
import { Command } from "../../models/Command";
import { API } from "../../service/PWHL/API";
import { Config } from "../../utils/constants";
import { optionalDateOption, processLocalizedDateInput } from "../../utils/helpers";
import { PWHLScheduleEmbedBuilder } from "../../utils/PWHLEmbedFormatters";

const teamScheduleSubcommandBuilder = new SlashCommandSubcommandBuilder()
	.setName("team")
	.setDescription("Get PWHL team schedule")
	.addStringOption((option) => option.setName("team").setDescription("Team code (e.g., SEA)").setRequired(true));

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

				const schedule = await API.Schedule.GetTeamSchedule(team.team_id);
				await interaction.followUp({
					embeds: [await PWHLScheduleEmbedBuilder(schedule, `${team.nickname}`)],
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
