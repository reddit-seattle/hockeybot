import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";
import { GameReplayManager } from "../../service/NHL/tasks/NHLGameReplayManager";
import { isGuildTextChannel } from "../../utils/helpers";
import { Logger } from "../../utils/Logger";

export const ReplayGame: Command = {
    name: "debug-game",
    adminOnly: true,
    description: "[DEBUG] Replay a completed game for testing game threads",
    slashCommandDescription: new SlashCommandBuilder().addStringOption((option) =>
        option.setName("game").setDescription("NHL Game ID (e.g., 2023020543)").setRequired(true),
    ),
    executeSlashCommand: async (interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const gameId = interaction.options.getString("game", true);

            if (isGuildTextChannel(interaction.channel)) {
                const channel = interaction.channel;
                const thread = await channel.threads.create({
                    name: `[DEBUG]Game: ${gameId}`,
                    autoArchiveDuration: 60,
                    reason: "Game replay",
                });

                await interaction.editReply({
                    content: `Starting game replay in ${thread}`,
                });

                // Start the replay
                const replayManager = new GameReplayManager(thread, gameId);

                await replayManager.start();
            }
        } catch (error: any) {
            Logger.error("Error in replay-game command:", error);
            await interaction.editReply({
                content: `Error: ${error?.message || "Unknown error occurred"}`,
            });
        }
    },
};
