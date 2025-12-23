import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";
import { PWHLGameReplayManager } from "../../service/PWHL/tasks/PWHLGameReplayManager";
import { isGuildTextChannel } from "../../utils/helpers";
import { Logger } from "../../utils/Logger";

export const ReplayGame: Command = {
	name: "debug-pwhl-game",
	adminOnly: true,
	description: "[DEBUG] Replay a completed PWHL game to test game threads",
	slashCommandDescription: new SlashCommandBuilder().addStringOption((option) =>
		option.setName("gameid").setDescription("PWHL Game ID (e.g., 137)").setRequired(true),
	),
	executeSlashCommand: async (interaction) => {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const gameId = interaction.options.getString("gameid", true);

			if (isGuildTextChannel(interaction.channel)) {
				const channel = interaction.channel;
				const thread = await channel.threads.create({
					name: `[DEBUG] PWHL Game: ${gameId}`,
					autoArchiveDuration: 60,
					reason: "PWHL game replay",
				});

				await interaction.editReply({
					content: `Starting PWHL game replay in ${thread}`,
				});

				// Start the replay
				const replayManager = new PWHLGameReplayManager(thread, gameId);
				await replayManager.start();
			}
		} catch (error: any) {
			Logger.error("[PWHL] Error in replay-game command:", error);
			await interaction.editReply({
				content: `Error: ${error?.message || "Unknown error occurred"}`,
			});
		}
	},
};
