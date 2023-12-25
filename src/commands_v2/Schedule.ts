import {
  EmbedBuilder,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from "@discordjs/builders";
import { Command } from "../models/Command";
import { AutocompleteInteraction } from "discord.js";
import { TeamTriCode } from "../utils/enums";
import { API } from "../service/API_v2";
import { Game as DayScheduleGame } from "../service/models/responses_v2/DaySchedule";
import { Game as TeamWeeklyScheduleGame } from "../service/models/responses_v2/TeamWeeklyScheduleResponse";
import { Game as TeamMonthlyScheduleGame } from "../service/models/responses_v2/TeamMonthlyScheduleResponse";
import { format, utcToZonedTime } from "date-fns-tz";
import _ from "underscore";
import { teamNameAutocomplete, validTeamName } from "../utils/helpers";

const teamScheduleSubgroupCommand = new SlashCommandSubcommandBuilder()
  .setName("team")
  .setDescription("look up a team's schedule")
  .addStringOption((option) =>
    option
      .setName("team")
      .setDescription("Team abbreviation (SEA)")
      .setAutocomplete(true)
      .setRequired(true)
  )
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
  .addStringOption((option) =>
    option
      .setName("date")
      .setDescription("YYYY-MM-DD please")
      .setRequired(false)
  );

export const GetSchedule: Command = {
  name: "schedulev2",
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
  autocomplete: teamNameAutocomplete,
};


const ScheduleEmbedBuilder = (
  schedule: (
    | DayScheduleGame
    | TeamWeeklyScheduleGame
    | TeamMonthlyScheduleGame
  )[]
) => {
  return new EmbedBuilder().setTitle("Games").addFields(
    schedule.map((item) => {
      return {
        name: `${item.awayTeam.abbrev} @ ${item.homeTeam.abbrev}`,
        value: `
            Date: ${format(utcToZonedTime(item.startTimeUTC, "America/Los_Angeles"), "PPPP")}
            Venue: ${item.venue.default}
        `,
        // todo - Listen: ${item.homeTeam.radioLink && `[${item.homeTeam.abbrev}]${item.homeTeam.radioLink}`} ${item.awayTeam.radioLink && `[${item.awayTeam.abbrev}]${item.awayTeam.radioLink}`}
        inline: false,
      };
    })
  );
};
