import { Message, MessageEmbed } from "discord.js";
import { format, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { Command } from "../models/Command";
import { API } from "../service/API";
import { GetMessageArgs } from "../utils/helpers";
import { Environment } from "../utils/constants";


const bot_thumbnail_image = `https://i.imgur.com/xHcfK8Q.jpg`;

export const GetSchedule: Command = {
	name: 'schedule',
	description: 'List of games on a given day',
	async execute(message: Message) {
		// check for date
		const args = GetMessageArgs(message);
		//expected: ['schedule', 'date']
		
		if(Environment.DEBUG) {
			console.log('Getting schedule')
			args && console.dir(args);
		}

		const date = args.length > 1 && args[1] || undefined;
		const schedule = await API.Schedule.GetSchedule(date);

		// sadness, no hockey today :(
		if(schedule.length == 0) {
			message.channel.send('Sad, no games today :(');
			return;
		}
		const title = date
		? `Schedule for ${format(zonedTimeToUtc(date,'America/Los_Angeles'), 'PPPP')}`
		: 'Schedule for today';
		// woohoo, hockey!
		const embed = new MessageEmbed({
			title: title,
			description: 'Games',
			color: 111111,
			footer: {
				text: 'Source: NHL API',
				iconURL: bot_thumbnail_image,
			},
			// image: {
			// 	url: bot_thumbnail_image,
			// },
			fields: schedule.map(game => {
				return {
					name: `${game.teams.away.team.name} @ ${game.teams.home.team.name}`,
					value: `${format(utcToZonedTime(game.gameDate, 'America/Los_Angeles'), 'HH:mm')} - ${game.venue.name}`,
					inline: false
				}
			})
		});
		message.channel.send(embed);
	},
}
