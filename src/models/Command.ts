import { Message } from "discord.js";

//TODO - expand interface to have a 'canExecute' method to check args and return help message
export interface Command {
    name: string;
    description: string;
    help?: string;
    adminOnly?: boolean;
    execute: (message: Message, args: string[]) => void;
}