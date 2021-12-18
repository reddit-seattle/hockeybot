import { Message } from "discord.js"
import { Config } from "./constants";

/**
 * Splits message content into an array of arguments by spaces.
 * Includes the actual command arg (without prefix) as the first element.
 * @param message The discord message to parse
 * @returns A string array of [command_arg, arg1, arg2, ...]
 */
 export const SplitMessageIntoArgs: (message: Message) => string[] = (message) => {
    return message.content.slice(Config.prefix.length).trim().split(' ');
}


// credit: Typescript documentation, src 
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#index-types
export function getProperty<T, K extends keyof T>(o: T, propertyName: K): T[K] {
    return o[propertyName]; // o[propertyName] is of type T[K]
}