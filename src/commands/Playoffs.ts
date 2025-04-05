import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../models/Command";
import { API } from "../service/API";
import { Colors } from "../utils/constants";

export const PlayoffBracket: Command = {
    name: "playoffs",
    description: "Show current NHL playoff bracket",
    slashCommandDescription: new SlashCommandBuilder(),
    executeSlashCommand: async (interaction) => {
        await interaction.deferReply();
        // current season
        const season = await API.Seasons.GetLatest();
        // carousel
        const playoffs = await API.Playoffs.GetPlayoffCarousel(`${season}`);
        const fields = playoffs.rounds.map((round) => {
            const { roundLabel, series } = round;
            return series.map((series) => {
                const { seriesLabel, bottomSeed, topSeed } = series;
                return {
                    name: `${roundLabel} - ${seriesLabel}`,
                    value: `${topSeed.abbrev} vs ${bottomSeed.abbrev}`,
                }
            });
        }).reduce((acc, val) => {
            return acc.concat(val);
        }, []);
        const embed = new EmbedBuilder()
            .setTitle(`NHL Playoff Bracket`)
            .setDescription(`Round ${playoffs.currentRound}`)
            .addFields(fields)
            .setColor(Colors.EMBED_COLOR);
        await interaction.followUp({
            embeds: [embed],
        });
    },
};