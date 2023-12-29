import {
  EmbedBuilder,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from "@discordjs/builders";
import { Command } from "../models/Command";
import { API } from "../service/API";
import { Game as DayScheduleGame } from "../service/models/responses/DaySchedule";
import { Game as TeamWeeklyScheduleGame } from "../service/models/responses/TeamWeeklyScheduleResponse";
import { Game as TeamMonthlyScheduleGame } from "../service/models/responses/TeamMonthlyScheduleResponse";
import { format, utcToZonedTime } from "date-fns-tz";
import _ from "underscore";
import { optionalDateOption, processLocalizedDateInput, relativeDateString, requiredTeamOption, teamOrPlayerAutocomplete, validTeamName } from "../utils/helpers";
import { Config } from "../utils/constants";

const teamScheduleSubgroupCommand = new SlashCommandSubcommandBuilder()
  .setName("team")
  .setDescription("look up a team's schedule")
  .addStringOption(requiredTeamOption)
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Weekly or Monthly")
      .addChoices(
        { name: "weekly", value: "weekly" },
        { name: "monthly", value: "monthly" }
      )
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
    const subcommand = interaction.options.getSubcommand();
    if (subcommand == "team") {
      const team = interaction.options.getString("team", true);
      if (!validTeamName(team)) {
        interaction.reply("That's not an NHL team name buddy");
        return;
      }
      await interaction.deferReply();
      const monthly = interaction.options.getString("type") == "monthly";
      const schedule = monthly
        ? await API.Schedule.GetTeamMonthlySchedule(team)
        : await API.Schedule.GetTeamWeeklySchedule(team);
      await interaction.followUp({
        embeds: [ScheduleEmbedBuilder(schedule, `${team} ${monthly ? 'Monthly' : 'Weekly'}`)],
      });
    } /*if (subcommand = 'all') */ else {
      await interaction.deferReply();
      const dateInput = interaction.options.getString("date", false);
      const adjustedDate = processLocalizedDateInput(dateInput);
      const schedule = await API.Schedule.GetDailySchedule(adjustedDate);
      await interaction.followUp({
        embeds: [ScheduleEmbedBuilder(schedule, format(adjustedDate ?? new Date(), Config.TITLE_DATE_FORMAT))],
      });
    }
  },
  autocomplete: teamOrPlayerAutocomplete,
};

// TODO - EmbedBuilders module
const ScheduleEmbedBuilder = (
  schedule: (
    | DayScheduleGame
    | TeamWeeklyScheduleGame
    | TeamMonthlyScheduleGame
  )[],
  scheduleTypeDisplay: string
) => {
  return new EmbedBuilder().setTitle(`${scheduleTypeDisplay} Schedule`).addFields(
    schedule.map((item) => {
        const {startTimeUTC, venue, awayTeam, homeTeam} = item;
        const dateSlug = relativeDateString(startTimeUTC);
        const dateStr = `${format(utcToZonedTime(startTimeUTC, Config.TIME_ZONE), Config.BODY_DATE_FORMAT)} (${dateSlug})`;
        const venuStr = `Venue: ${venue.default}`
        let output = `${dateStr}\n${venuStr}`
        // only show radio links if available
        const {radioLink: awayAudio} = awayTeam;
        const {radioLink: homeAudio} = homeTeam;
        const homeRadioStr = homeAudio && `[${homeTeam.abbrev}](${homeAudio})`;
        const awayRadioStr = awayAudio && `[${awayTeam.abbrev}](${awayAudio})`;
        if(homeRadioStr || awayRadioStr){
            output+= `\nListen: ${[homeRadioStr, awayRadioStr].filter(x => x != undefined).join(' - ')}`;
        }
        

      return {
        name: `${awayTeam.abbrev} @ ${homeTeam.abbrev}`,
        value: output,
        inline: false,
      };
    })
  );
};
