import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { format } from "date-fns-tz";
import { Command } from "../../models/Command";
import { API } from "../../service/NHL/API";
import { Config } from "../../utils/constants";
import { ScheduleEmbedBuilder } from "../../utils/EmbedFormatters";
import {
    optionalDateOption,
    processLocalizedDateInput,
    requiredTeamOption,
    teamOrPlayerAutocomplete,
    validTeamName,
} from "../../utils/helpers";

const teamScheduleSubgroupCommand = new SlashCommandSubcommandBuilder()
    .setName("team")
    .setDescription("look up a team's schedule")
    .addStringOption(requiredTeamOption)
    .addStringOption((option) =>
        option
            .setName("type")
            .setDescription("Weekly or Monthly")
            .addChoices({ name: "weekly", value: "weekly" }, { name: "monthly", value: "monthly" })
    );
const leagueScheduleSubgroupCommand = new SlashCommandSubcommandBuilder()
    .setName("all")
    .setDescription("see all games")
    .addStringOption(optionalDateOption);

export const GetSchedule: Command = {
    name: "schedule",
    description: "NHL Game Schedule",
    slashCommandDescription: new SlashCommandBuilder()
        .addSubcommand(leagueScheduleSubgroupCommand)
        .addSubcommand(teamScheduleSubgroupCommand),
    executeSlashCommand: async (interaction) => {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();
        if (subcommand == "team") {
            const team = interaction.options.getString("team", true);
            if (!validTeamName(team)) {
                interaction.reply("That's not an NHL team name buddy");
                return;
            }

            const monthly = interaction.options.getString("type") == "monthly";
            const schedule = monthly
                ? await API.Schedule.GetTeamMonthlySchedule(team)
                : await API.Schedule.GetTeamWeeklySchedule(team);
            await interaction.followUp({
                embeds: [await ScheduleEmbedBuilder(schedule, `${team} ${monthly ? "Monthly" : "Weekly"}`)],
            });
        } else {
            const dateInput = interaction.options.getString("date", false);
            const adjustedDate = processLocalizedDateInput(dateInput);
            const schedule = await API.Schedule.GetDailySchedule(adjustedDate);
            await interaction.followUp({
                embeds: [
                    await ScheduleEmbedBuilder(schedule, format(adjustedDate ?? new Date(), Config.TITLE_DATE_FORMAT)),
                ],
            });
        }
    },
    autocomplete: teamOrPlayerAutocomplete,
};
