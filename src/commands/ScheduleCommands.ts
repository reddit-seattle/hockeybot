import { EmbedField, Message, MessageEmbed } from "discord.js";
import { format, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { last, first, values } from 'underscore';
import { Command } from "../models/Command";
import { API } from "../service/API";
import { Config, Environment, GameStates, Record } from "../utils/constants";


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
		message.channel.send({embeds: [embed]});
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
						value: `${format(utcToZonedTime(game.gameDate, 'America/Los_Angeles'), 'PPPPp')}`,
						inline: false
					}
				})
			});
			message.channel.send({embeds: [embed]});
			
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
			const allGames = await (await API.Schedule.GetTeamSchedule(team.id, season?.regularSeasonStartDate, today)).filter(x => x.status.codedGameState == GameStates.FINAL);

			if(!allGames?.[0]){
				message.channel.send(`Could not find any previous games for ${args[2]} this season`);
				return;
			}
			
			const games = last(allGames, numberGames);
			const fields: EmbedField[] = [];
			const record: Record = {
				Wins: 0,
				Losses: 0,
				Overtime: 0
			}

			for (const game of games) {
				const gameresult = await API.Games.GetGameById(game.gamePk);
				const { liveData } = gameresult;
				const { linescore } = liveData;
				const isHome = (team.id === linescore.teams.home.team.id);
				const teamObj = isHome ? linescore.teams.home : linescore.teams.away
				const opponentObj = isHome ? linescore.teams.away : linescore.teams.home;
				const win = teamObj.goals > opponentObj.goals;
				const ot = linescore.currentPeriod > 3;
				const shootout = liveData.linescore.hasShootout;
				const result = win ? "W" : (ot ? "OTL" : (shootout ? 'SOL' : 'L'));
				switch(result) {
					case 'W': record.Wins++; break;
					case 'L': record.Losses++; break;
					case 'OTL':
					case 'SOL': record.Overtime++;break;
				}
				fields.push({
					name: `${teamObj.team.triCode} ${isHome ? 'VS' : '@'} ${opponentObj.team.triCode} : **${result}**`,
					value: `${gameresult.gameData.status.detailedState} : ${teamObj.goals} - ${opponentObj.goals}`,
					inline: false
				});
			}

			const embed = new MessageEmbed({
				title: `Last ${numberGames} games for the ${team.teamName}`,
				description: `Record: (${record.Wins} - ${record.Losses} - ${record.Overtime})`,
				color: 111111,
				footer: {
					text: 'Source: NHL API',
					iconURL: bot_thumbnail_image,
				},
				// image: {
				// 	url: bot_thumbnail_image,
				// },
				fields: fields
			});
			message.channel.send({embeds: [embed]});
			
		}
		else{
			message.channel.send(
				`Usage: next {games: number} {team_abbreviation: string}\n
				 Example: \`${Config.prefix} next 5 PHI\``
			);
		}
	}
}

export const GetScores: Command = {
	name: 'scores',
	description: 'Scores of current games',
	help: 'scores',
	async execute(message: Message, args: string[]) {

		const allGames = (await API.Schedule.GetSchedule());

		// sadness, no hockey today :(
		if(allGames.length == 0) {
			message.channel.send('Sad, no games today :(');
			return;
		}

		const nowPlaying = allGames.filter(x => x.status.codedGameState != GameStates.PREVIEW );
		//
		if(nowPlaying.length == 0) {
			message.channel.send('No games have started yet. Check `$nhl schedule` for start times.');
			return;
		}

		const embed = new MessageEmbed({
			title: `Scores`,
			description: '',
			color: 111111,
			footer: {
				text: 'Source: NHL API',
				iconURL: bot_thumbnail_image,
			},
			// image: {
			// 	url: bot_thumbnail_image,
			// },
			fields: nowPlaying.map(game => {

				const teamScores = `${game.teams.away.team.name}: ${game.teams.away.score} @ ${game.teams.home.team.name}: ${game.teams.home.score}`;
				let gameStatus = '';
				switch(game.status.codedGameState) {
					case GameStates.FINAL:
					case GameStates.FINAL_PENDING:
					case GameStates.GAME_OVER: gameStatus = 'Final Score'; break;
					case GameStates.IN_PROGRESS_CRIT: 
					case GameStates.IN_PROGRESS: gameStatus = `${game.linescore.currentPeriodTimeRemaining} ${game.linescore.currentPeriodOrdinal} period`; break;
					case GameStates.PRE_GAME: gameStatus ='Pre-game'; break;
					default: gameStatus = game.status.abstractGameState;
				}
				return {
					name: teamScores,
					value: gameStatus,
					inline: false
				}
			})
		});
		message.channel.send({embeds: [embed]});
	}
}