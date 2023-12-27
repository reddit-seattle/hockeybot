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
import { optionalDateOption, requiredTeamOption, teamOrPlayerAutocomplete, validTeamName } from "../utils/helpers";

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
        embeds: [ScheduleEmbedBuilder(schedule)],
      });
    } /*if (subcommand = 'all') */ else {
      await interaction.deferReply();
      const date = interaction.options.getString("date", false);
      const schedule = await API.Schedule.GetDailySchedule(
        date ? new Date(date) : undefined
      );
      await interaction.followUp({
        embeds: [ScheduleEmbedBuilder(schedule)],
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
  )[]
) => {
  return new EmbedBuilder().setTitle("Games").addFields(
    schedule.map((item) => {
        const {startTimeUTC, venue, awayTeam, homeTeam} = item;
        const dateStr = `Date: ${format(utcToZonedTime(startTimeUTC, "America/Los_Angeles"), "PPPP")}`
        const venuStr = `Venue: ${venue.default}`
        let output = `
            ${dateStr}
            ${venuStr}
        `
        // only show radio links if available
        const {radioLink: awayAudio} = awayTeam;
        const {radioLink: homeAudio} = homeTeam;
        const homeRadioStr = homeAudio && `[${homeTeam.abbrev}](${homeAudio})`;
        const awayRadioStr = awayAudio && `[${awayTeam.abbrev}](${awayAudio})`;
        if(homeRadioStr || awayRadioStr){
            output+= `
                ${[homeRadioStr, awayRadioStr].filter(x => x != undefined).join(' - ')}
            `
        }
        

      return {
        name: `${awayTeam.abbrev} @ ${homeTeam.abbrev}`,
        value: output,
        inline: false,
      };
    })
  );
};
