import { Message } from "discord.js"
import { Config } from "./constants";

export const GetMessageArgs:(message: Message) => string[] = (message) => {
    return message.content.slice(Config.prefix.length).trim().split(' ');
}