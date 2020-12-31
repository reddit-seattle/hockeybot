import { Message, MessageEmbed } from "discord.js";
import { format, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { last, first } from 'underscore';
import { Command } from "../models/Command";
import { API } from "../service/API";
import { Config, Environment } from "../utils/constants";


const bot_thumbnail_image = `https://i.imgur.com/xHcfK8Q.jpg`;

export const GetSchedule: Command = {
	name: 'schedule',
	description: 'List of games on a given day',
	help: 'schedule 2020-01-01',
	async execute(message: Message, args: string[]) {
		// check for date
		const date = args?.[1];
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

export const GetNextGamesForTeam: Command = {
	name: 'next',
	description: 'Next [x] game results for team [y]',
	help: 'next 5 PHI',
	execute: async (message: Message, args: string[]) => {
		//expect ['next', number, 'PHI']
		if(args?.[1] && args?.[2]) {
			//get today's date as start
			const numberGames = Number.parseInt(args[1]);
			const team = await API.Teams.GetTeamByAbbreviation(args[2]);
			if(!team?.id){
				message.channel.send(`No team found for input: ${args[2]}`);
				return;
			}
			const start = format(new Date(), "yyyy-MM-dd")
			//get end of most recent season as end
			const season = await API.Seasons.GetCurrentSeason();
			//pull last args[1] games for team args[2]

			if(Environment.DEBUG) {
				console.log(`team: ${team.teamName}`);
				console.log(`start: ${start}`);
				console.log(`end: ${season?.seasonEndDate}`);
			}
			const allGames = await API.Schedule.GetTeamSchedule(team.id, start, season?.seasonEndDate);
			

			if(!allGames?.[0]){
				message.channel.send(`Could not find any remaining games for ${args[2]} this season`);
				return;
			}
			const games = first(allGames, numberGames);

			const embed = new MessageEmbed({
				title: `Next ${numberGames} games for the ${team.teamName}`,
				description: 'Games',
				color: 111111,
				footer: {
					text: 'Source: NHL API',
					iconURL: bot_thumbnail_image,
				},
				// image: {
				// 	url: bot_thumbnail_image,
				// },
				fields: games.map(game => {
					return {
						name: `${game.teams.away.team.name} @ ${game.teams.home.team.name}`,
						value: `${format(utcToZonedTime(game.gameDate, 'America/Los_Angeles'), 'HH:mm')} - ${game.venue.name}`,
						inline: false
					}
				})
			});
			message.channel.send(embed);
			
		}
		else{
			message.channel.send(
				`Usage: next {games: number} {team_abbreviation: string}\n
				 Example: \`${Config.prefix} next 5 PHI\``
			);
		}
	}
}

export const GetLastGamesForTeam: Command = {
	name: 'last',
	description: 'Last [x] game results for team [y]',
	help: 'last 10 mtl',
	execute: async (message: Message, args: string[]) => {
		//expect ['next', number, 'PHI']
		if(args?.[1] && args?.[2]) {
			const numberGames = Number.parseInt(args[1]);
			const team = await API.Teams.GetTeamByAbbreviation(args[2]);
			if(!team?.id){
				message.channel.send(`No team found for input: ${args[2]}`);
				return;
			}
			const today = format(new Date(), "yyyy-MM-dd")
			const season = await API.Seasons.GetCurrentSeason();
			if(Environment.DEBUG) {
				console.log(`team: ${team.teamName}`);
				console.log(`start: ${season?.regularSeasonStartDate}`);
				console.log(`end: ${today}`);
			}
			const allGames = await API.Schedule.GetTeamSchedule(team.id, season?.regularSeasonStartDate, today);

			if(!allGames?.[0]){
				message.channel.send(`Could not find any previous games for ${args[2]} this season`);
				return;
			}
			
			const games = last(allGames, numberGames);

			//todo - change display from game time and venue to results / box score data
			const embed = new MessageEmbed({
				title: `Last ${numberGames} games for the ${team.teamName}`,
				description: 'Games',
				color: 111111,
				footer: {
					text: 'Source: NHL API',
					iconURL: bot_thumbnail_image,
				},
				// image: {
				// 	url: bot_thumbnail_image,
				// },
				fields: games.map(game => {
					return {
						name: `${game.teams.away.team.name} @ ${game.teams.home.team.name}`,
						value: `${format(utcToZonedTime(game.gameDate, 'America/Los_Angeles'), 'HH:mm')} - ${game.venue.name}`,
						inline: false
					}
				})
			});
			message.channel.send(embed);
			
		}
		else{
			message.channel.send(
				`Usage: next {games: number} {team_abbreviation: string}\n
				 Example: \`${Config.prefix} next 5 PHI\``
			);
		}
	}
}
