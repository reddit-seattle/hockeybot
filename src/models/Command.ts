import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, Message, PartialMessage } from "discord.js";


//TODO - expand interface to have a 'canExecute' method to check args and return help message
export interface Command {
    name: string;
    adminOnly?: boolean;
    description: string;
    slashCommandDescription?:  () => Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
    executeSlashCommand?: (options:  ChatInputCommandInteraction) => void;
}
export interface CommandDictionary { [id: string]: Command }

export interface ReactionCommand extends Command {
    emojiId: string;
    removeReaction?: boolean;
    execute: (message: Message | PartialMessage) => void;
}

export interface ReactionCommandDictionary { [id: string]: ReactionCommand }