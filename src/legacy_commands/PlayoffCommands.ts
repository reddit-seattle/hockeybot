import { SlashCommandBuilder } from "@discordjs/builders";
import { Message, EmbedBuilder, TextChannel } from "discord.js";
import { Command } from "../models/Command";
import { API } from "../service/legacy_API";
import { PlayoffRoundFormatter } from "../utils/EmbedFormatters";

export const GetPlayoffStandings: Command = {
	name: 'playoffs',
	description: 'Current playoff standings',
    slashCommandDescription: new SlashCommandBuilder()
        .setName('playoffs')
        .setDescription('Current playoff standings'),
    executeSlashCommand: async (interaction) => {
        interaction.deferReply();
        const rounds = await API.Playoffs.GetPlayoffStandings();
        if(!rounds?.[0]){
            interaction.followUp('Playoff results not available.')
            return;
        }
        interaction.followUp({embeds: [
            new EmbedBuilder({
                title: 'Playoff Standings',
                fields: rounds.map(round => {
                    return PlayoffRoundFormatter(round);
                })
            })
        ]});
        
        
    }
}
const oldCommand = async (message: Message, args?: string[]) => {
    const rounds = await API.Playoffs.GetPlayoffStandings();
    if(!rounds?.[0]){
        (message.channel as TextChannel).send('Playoff results not available.')
        return;
    }

    (message.channel as TextChannel).send({embeds: [
        new EmbedBuilder({
            title: 'Playoff Standings',
            fields: rounds.map(round => {
                return PlayoffRoundFormatter(round);
            })
        })
    ]});
}