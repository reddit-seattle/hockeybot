import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "@discordjs/builders";
import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, Message, PartialMessage } from "discord.js";


//TODO - expand interface to have a 'canExecute' method to check args and return help message
export interface Command {
    name: string;
    adminOnly?: boolean;
    description: string;
    slashCommandDescription: any;
    executeSlashCommand: (interaction:  ChatInputCommandInteraction) => void;
    autocomplete?(interaction: AutocompleteInteraction<CacheType>): void;
}
export interface CommandDictionary { [id: string]: Command }