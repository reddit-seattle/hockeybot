import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import { Command } from "../../models/Command";
import { pwhlScheduleMonitorService } from "../../service/ScheduleMonitorService";
import { Logger } from "../../utils/Logger";
import { pwhlGameAutocomplete } from "../../utils/autocomplete";

export const GameThread: Command = {
	name: "pwhl-game-thread",
	adminOnly: true,
	description: "Start game thread for a PWHL game",
	slashCommandDescription: new SlashCommandBuilder().addStringOption((option) =>
		option.setName("gameid").setDescription("Game ID (e.g., 137)").setRequired(true).setAutocomplete(true),
	),
	autocomplete: pwhlGameAutocomplete,
	executeSlashCommand: async (interaction) => {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const gameId = interaction.options.getString("gameid", true);

		const scheduleMonitor = pwhlScheduleMonitorService.get();
		if (!scheduleMonitor) {
			await interaction.followUp({ content: "No schedule monitor available." });
			return;
		}

		try {
			const wasAdded = await scheduleMonitor.addGameToTrack(gameId);

			if (wasAdded) {
				await interaction.followUp({ content: `Tracking PWHL game ID: ${gameId}` });
				Logger.info(`[PWHL] Tracking game ID: ${gameId}`);
			} else {
				// todo - link to existing thread?
				await interaction.followUp({ content: `Game ${gameId} is already being tracked.` });
			}
		} catch (e) {
			Logger.error("[PWHL] Error creating game thread:", e);
			await interaction.followUp({ content: "Error creating game thread." });
		}
	},
};
