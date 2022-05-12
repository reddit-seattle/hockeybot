import { SlashCommandBuilder } from "@discordjs/builders";
import { Message, MessageEmbed } from "discord.js";
import { Command } from "../models/Command";
import { API } from "../service/API";
import { PlayoffRoundFormatter } from "../utils/EmbedFormatters";

export const GetPlayoffStandings: Command = {
	name: 'playoffs',
	description: 'Current playoff standings',
	help: 'playoffs',
	async execute(message: Message, args?: string[]) {
        const rounds = await API.Playoffs.GetPlayoffStandings();
        if(!rounds?.[0]){
            message.channel.send('Playoff results not available.')
            return;
        }
	
	    message.channel.send({embeds: [
            new MessageEmbed({
                title: 'Playoff Standings',
                fields: rounds.map(round => {
                    return PlayoffRoundFormatter(round);
                })
            })
        ]});

	},
	slashCommandDescription: () => {
		return new SlashCommandBuilder()
		.setName('playoffs')
		.setDescription('Current playoff standings');
	},
	executeSlashCommand: async (interaction) => {
        interaction.deferReply();
        const rounds = await API.Playoffs.GetPlayoffStandings();
        if(!rounds?.[0]){
            interaction.followUp('Playoff results not available.')
            return;
        }
        interaction.followUp({embeds: [
            new MessageEmbed({
                title: 'Playoff Standings',
                fields: rounds.map(round => {
                    return PlayoffRoundFormatter(round);
                })
            })
        ]});
        
        
	}
}