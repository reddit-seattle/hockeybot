import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { Command } from "../../models/Command";
import { API } from "../../service/MLB/API";

import { TeamIds } from "../../utils/constants";
import { optionalDateOption } from "../../utils/helpers";

export const GetMarinersGameToday: Command = {
    name: "mariners",
    description: "Mariners Schedule",
    slashCommandDescription: new SlashCommandBuilder().addStringOption(optionalDateOption),
    executeSlashCommand: async (interaction) => {
        const dateInput = interaction.options.getString("date", false);
        const date = dateInput ? new Date(dateInput) : new Date();
        await interaction.deferReply();
        const games = await API.Schedule.ByDate(date, TeamIds.Mariners);
        if (games.length > 0) {
            const game = games[0];
            const gameDate = new Date(game.gameDate);
            const gameTime = new Date(game.gameDate).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });
            const homeTeam = game.teams.home.team.name;
            const awayTeam = game.teams.away.team.name;
            const title = `${homeTeam} vs ${awayTeam}`;
            const description = `Game Date: ${gameDate.toLocaleDateString("en-US")}\nGame Time: ${gameTime}`;
            await interaction.followUp({
                embeds: [new EmbedBuilder().setTitle(title).setDescription(description)],
            });
            return;
        }
        await interaction.followUp({
            embeds: [new EmbedBuilder().setTitle("Mariners Schedule").setDescription("No Mariners games today")],
        });
    },
};
