import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction } from "discord.js";


export interface Command {
    name: string;
    adminOnly?: boolean;
    description: string;
    slashCommandDescription: any;
    executeSlashCommand: (interaction:  ChatInputCommandInteraction) => void;
    autocomplete?(interaction: AutocompleteInteraction<CacheType>): void;
}
export interface CommandDictionary { [id: string]: Command }