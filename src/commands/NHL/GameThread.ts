import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import { Command } from "../../models/Command";
import { nhlScheduleMonitorService } from "../../service/ScheduleMonitorService";
import { activeGameAutocomplete } from "../../utils/autocomplete";
import { Logger } from "../../utils/Logger";

export const GameThread: Command = {
    name: "gamethread",
    adminOnly: true,
    description: "Track a specific game and create a game thread",
    slashCommandDescription: new SlashCommandBuilder().addStringOption((option) =>
        option
            .setName("game")
            .setDescription("Select a game from today's schedule")
            .setRequired(true)
            .setAutocomplete(true),
    ),
    executeSlashCommand: async (interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const gameId = interaction.options.getString("game", true);

        const scheduleMonitor = nhlScheduleMonitorService.get();
        if (!scheduleMonitor) {
            await interaction.followUp({ content: "Game tracking is not enabled." });
            return;
        }

        try {
            const wasAdded = await scheduleMonitor.addGameToTrack(gameId);

            if (wasAdded) {
                await interaction.followUp({ content: `Now tracking game ID: ${gameId}` });
            } else {
                // TODO - link to existing thread
                await interaction.followUp({ content: `Game ${gameId} is already being tracked.` });
            }
        } catch (e) {
            Logger.error("Error tracking game:", e);
            await interaction.followUp({ content: "Failed to track game. Please try again later." });
        }
    },
    autocomplete: activeGameAutocomplete,
};
