import { MessageFlags, SlashCommandBuilder, ThreadAutoArchiveDuration } from "discord.js";
import { Command } from "../../models/Command";
import { MLBGameReplayManager } from "../../service/MLB/tasks/MLBGameReplayManager";
import { isGuildTextChannel } from "../../utils/helpers";
import { Logger } from "../../utils/Logger";

export const ReplayMLBGame: Command = {
	name: "debug-mlb-game",
	adminOnly: true,
	description: "[DEBUG] Replay a completed MLB game for testing game threads",
	slashCommandDescription: new SlashCommandBuilder().addStringOption((option) =>
		option.setName("game").setDescription("MLB Game ID (gamePk, e.g., 813054)").setRequired(true),
	),
	executeSlashCommand: async (interaction) => {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const gameId = interaction.options.getString("game", true);

			if (isGuildTextChannel(interaction.channel)) {
				const channel = interaction.channel;
				const thread = await channel.threads.create({
					name: `[DEBUG]MLB: ${gameId}`,
					autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
					reason: "MLB game replay",
				});

				await interaction.editReply({
					content: `Starting MLB game replay in ${thread}`,
				});

				// Start the replay
				const replayManager = new MLBGameReplayManager(thread, gameId);
				await replayManager.start();
			}
		} catch (error: any) {
			Logger.error("Error in debug-mlb-game command:", error);
			await interaction.editReply({
				content: `Error: ${error?.message || "Unknown error occurred"}`,
			});
		}
	},
};
