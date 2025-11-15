import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import { Command } from "../../models/Command";
import { mlbScheduleMonitorService } from "../../service/ScheduleMonitorService";
import { mlbGameAutocomplete } from "../../utils/autocomplete";
import { Logger } from "../../utils/Logger";

export const MLBGameThread: Command = {
    name: "mlbgamethread",
    adminOnly: true,
    description: "Track a specific MLB game with a game thread",
    slashCommandDescription: new SlashCommandBuilder().addStringOption((option) =>
        option
            .setName("game")
            .setDescription("Select an MLB game from today's schedule")
            .setRequired(true)
            .setAutocomplete(true),
    ),
    executeSlashCommand: async (interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const gameId = interaction.options.getString("game", true);

        const scheduleMonitor = mlbScheduleMonitorService.get();
        if (!scheduleMonitor) {
            await interaction.followUp({ content: "MLB game tracking is not enabled." });
            return;
        }

        try {
            const wasAdded = await scheduleMonitor.trackGameById(gameId);

            if (wasAdded) {
                await interaction.followUp({ content: `Now tracking MLB game: ${gameId}` });
            } else {
                await interaction.followUp({ content: `MLB game ${gameId} is already being tracked.` });
            }
        } catch (e) {
            Logger.error("Error tracking MLB game:", e);
            await interaction.followUp({ content: "Failed to track MLB game. Please try again later." });
        }
    },
    autocomplete: mlbGameAutocomplete,
};
