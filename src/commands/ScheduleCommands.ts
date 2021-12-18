import { SlashCommandBuilder } from "@discordjs/builders";
import { EmbedField, Message, MessageEmbed } from "discord.js";
import { format, zonedTimeToUtc } from 'date-fns-tz';
import { last, first } from 'underscore';
import { Command } from "../models/Command";
import { API } from "../service/API";
import { Config, Environment, GameStates, MEDIA_FORMAT, Record } from "../utils/constants";
import { NextGameFieldFormatter, ScheduledGameFieldFormatter } from "../utils/EmbedFormatters";

const bot_thumbnail_image = `https://i.imgur.com/xHcfK8Q.jpg`;

export const GetSchedule: Command = {
	name: 'schedule',
	description: 'List of games on a given day',
	help: 'schedule 2020-01-01',
	async execute(message: Message, args?: string[]) {
		// check for date
		const date = args?.[0];
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
				return ScheduledGameFieldFormatter(game);
			})
		});
		message.channel.send({embeds: [embed]});
	},
	slashCommandDescription: () => {
		return new SlashCommandBuilder()
		.setName('schedule')
		.setDescription('List of games on a given day')
		.addStringOption(option => {
			return option.setName('date')
				.setDescription('Date')
				.setRequired(false);
		})
	},
	executeSlashCommand: async (interaction) => {
		const date = interaction.options.getString('date') ?? '';
		const schedule = await API.Schedule.GetSchedule(date);

		// sadness, no hockey today :(
		if(schedule.length == 0) {
			interaction.reply('Sad, no games today :(');
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
				return ScheduledGameFieldFormatter(game);
			})
		});
		interaction.reply({embeds: [embed]});
	}
}

export const GetNextGamesForTeam: Command = {
	name: 'next',
	description: 'Next [x] game results for team [y]',
	help: 'next 5 PHI',
	execute: async (message: Message, args?: string[]) => {
		//expect [number, 'PHI']
		if(args?.[0] && args?.[1]) {
			//get today's date as start
			const numberGames = Number.parseInt(args[0]);
			const team = await API.Teams.GetTeamByAbbreviation(args[1]);
			if(!team?.id){
				message.channel.send(`No team found for input: ${args[1]}`);
				return;
			}
			const start = format(new Date(), "yyyy-MM-dd")
			//get end of most recent season as end
			const season = await API.Seasons.GetCurrentSeason();
			//pull last args[1] games for team args[2]

			const allGames = await API.Schedule.GetTeamSchedule(team.id, start, season?.seasonEndDate);
			

			if(!allGames?.[0]){
				message.channel.send(`Could not find any remaining games for ${args[1]} this season`);
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
					return NextGameFieldFormatter(game)
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
	},
	slashCommandDescription: () => {
		return new SlashCommandBuilder()
		.setName('next')
		.setDescription('Next game results for a team')
		.addStringOption(option => {
			return option.setName('team')
				.setDescription('team abbreviation to check schedule for')
				.setRequired(true)
		})
		.addNumberOption(option => {
			return option.setName('number')
				.setDescription('number of games to fetch')
				.setRequired(false);
		})
	},
	executeSlashCommand: async (interaction) => {
		//expect [number, 'PHI']
		const teamAbbreviation = interaction.options.getString('team');
		const numberGames = interaction.options.getNumber('number') ?? 5;
		if(teamAbbreviation) {
			//get today's date as start
			const team = await API.Teams.GetTeamByAbbreviation(teamAbbreviation);
			if(!team?.id){
				interaction.reply(`Error finding team ${teamAbbreviation}`);
				return;
			}
			const start = format(new Date(), "yyyy-MM-dd")
			//get end of most recent season as end
			const season = await API.Seasons.GetCurrentSeason();
			//pull last args[1] games for team args[2]

			const allGames = await API.Schedule.GetTeamSchedule(team.id, start, season?.seasonEndDate);
			

			if(!allGames?.[0]){
				interaction.reply(`Could not find any remaining games for the ${team.teamName} this season`);
				return;
			}
			await interaction.deferReply();
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
					return NextGameFieldFormatter(game)
				})
			});
			await interaction.editReply({embeds: [embed]});
			
		}
		else{
			interaction.reply(
				`I need a team abbreviation, buddy`
			);
		}
	}
}

export const GetLastGamesForTeam: Command = {
	name: 'last',
	description: 'Last [x] game results for team [y]',
	help: 'last 10 mtl',
	execute: async (message: Message, args?: string[]) => {
		//expect ['next', number, 'PHI']
		if(args?.[0] && args?.[1]) {
			const numberGames = Number.parseInt(args[0]);
			const team = await API.Teams.GetTeamByAbbreviation(args[1]);
			if(!team?.id){
				message.channel.send(`No team found for input: ${args[1]}`);
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
				message.channel.send(`Could not find any previous games for ${args[1]} this season`);
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
	},
	slashCommandDescription: () => {
		return new SlashCommandBuilder()
		.setName('last')
		.setDescription('Last game results for a team')
		.addStringOption(option => {
			return option.setName('team')
				.setDescription('team abbreviation to check results for')
				.setRequired(true)
		})
		.addNumberOption(option => {
			return option.setName('number')
				.setDescription('number of games to fetch')
				.setRequired(false);
		})
	},
	executeSlashCommand: async (interaction) => {
		//expect [number, 'PHI']
		const teamAbbreviation = interaction.options.getString('team');
		const numberGames = interaction.options.getNumber('number') ?? 10;
		if(teamAbbreviation) {
			const team = await API.Teams.GetTeamByAbbreviation(teamAbbreviation);
			if(!team?.id){
				interaction.reply(`No team found for input: ${teamAbbreviation}`);
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
				interaction.reply(`Could not find any previous games for ${team.teamName} this season`);
				return;
			}
			
			const games = last(allGames, numberGames);
			await interaction.deferReply();
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
			await interaction.editReply({embeds: [embed]});
			
		}
		else{
			interaction.reply(
				`I need a team abbreviation, buddy.`
			);
		}
	}
}

export const GetScores: Command = {
	name: 'scores',
	description: 'Scores of current games',
	help: 'scores',
	async execute(message: Message, args?: string[]) {

		const allGames = await API.Schedule.GetSchedule();

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
					case GameStates.ALMOST_FINAL:
					case GameStates.GAME_OVER: gameStatus = 'Final Score'; break;
					case GameStates.CRITICAL: 
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
	},
	slashCommandDescription: () => {
		return new SlashCommandBuilder()
		.setName('scores')
		.setDescription('Current game scores')
	},
	executeSlashCommand: async (interaction) => {
		const allGames = await API.Schedule.GetSchedule();

		// sadness, no hockey today :(
		if(allGames.length == 0) {
			interaction.reply('Sad, no games today :(');
			return;
		}

		const nowPlaying = allGames.filter(x => x.status.codedGameState != GameStates.PREVIEW );
		//
		if(nowPlaying.length == 0) {
			interaction.reply('No games have started yet. Check `$nhl schedule` for start times.');
			return;
		}
		await interaction.deferReply();
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
					case GameStates.ALMOST_FINAL:
					case GameStates.GAME_OVER: gameStatus = 'Final Score'; break;
					case GameStates.CRITICAL: 
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
		await interaction.editReply({embeds: [embed]});
	}
}

export const GetLastGameRecap: Command = {
	description: 'Get last game recap for a team',
	name: 'recap',
	help: 'recap SEA',
	execute: async (message, args) => {
		//expect ['next', number, 'PHI']
		if(!args?.[0] || args?.[0]?.length != 3) {
			message.channel.send("No team abbreviation provided");
			return;
		}
		const team = await API.Teams.GetTeamByAbbreviation(args[0]);
		const teamId = team?.id;
		if(!teamId) {
			message.channel.send(`Invalid team abbreviation: ${args[0]}`);
			return;
		}

		const lastGame = await API.Teams.GetTeamsLastGame(teamId);
		const { linescore, gamePk } = lastGame;
		const { teams } = linescore;
		const { away, home } = teams;
		const content = await API.Games.GetGameContent(gamePk);

		const { editorial, media } = content;
		let title = editorial.preview.items?.[0].headline;
		const recap = editorial?.recap?.items?.[0];
		const { headline, subhead } = recap;
		const extendedHighlights = media.epg.filter(epg => epg.title == "Extended Highlights")?.[0];
		const { playbacks } = extendedHighlights.items?.[0];
		const embedPlayback = playbacks?.filter(play => play.name == MEDIA_FORMAT.FLASH_1800K_896x504)?.[0];
		if(embedPlayback?.url) {
			title = `[${title}](${embedPlayback.url})`;
		}
		const embed = new MessageEmbed({
			title,
			description: `${headline}\n${subhead}`,
			footer: {
				text: recap.contributor.contributors?.[0].name
			},
			
			video: {
				url: embedPlayback.url
			},
			fields: [away, home].map(team => {
				return {
					name: team.team.name,
					value: `Goals: ${team.goals}\nShots: ${team.shotsOnGoal}`
				}
			})
		});
		message.channel.send({embeds: [embed]});
	},
	slashCommandDescription: () => {
		return new SlashCommandBuilder()
		.setName('recap')
		.setDescription('last game recap for team by abbreviation')
		.addStringOption(option => {
			return option
			.setName('team')
			.setDescription('Team abbreviation')
			.setRequired(true)
		})
	},
	executeSlashCommand: async (interaction) => {
		//expect ['next', number, 'PHI']
		const teamAbbreviation = interaction.options.getString('team');
		if(!teamAbbreviation) {
			interaction.reply("I need a team abbreviation, buddy");
			return;
		}
		const team = await API.Teams.GetTeamByAbbreviation(teamAbbreviation);
		const teamId = team?.id;
		if(!teamId) {
			interaction.reply(`Invalid team abbreviation: ${teamAbbreviation}`);
			return;
		}

		const lastGame = await API.Teams.GetTeamsLastGame(teamId);
		const { linescore, gamePk } = lastGame;
		const { teams } = linescore;
		const { away, home } = teams;
		const content = await API.Games.GetGameContent(gamePk);

		const { editorial, media } = content;
		let title = editorial.preview.items?.[0].headline;
		const recap = editorial?.recap?.items?.[0];
		const { headline, subhead } = recap;
		const extendedHighlights = media.epg.filter(epg => epg.title == "Extended Highlights")?.[0];
		const { playbacks } = extendedHighlights.items?.[0];
		const embedPlayback = playbacks?.filter(play => play.name == MEDIA_FORMAT.FLASH_1800K_896x504)?.[0];
		if(embedPlayback?.url) {
			title = `[${title}](${embedPlayback.url})`;
		}
		const embed = new MessageEmbed({
			title,
			description: `${headline}\n${subhead}`,
			footer: {
				text: recap.contributor.contributors?.[0].name
			},
			
			video: {
				url: embedPlayback.url
			},
			fields: [away, home].map(team => {
				return {
					name: team.team.name,
					value: `Goals: ${team.goals}\nShots: ${team.shotsOnGoal}`
				}
			})
		});
		interaction.reply({embeds: [embed]});
	}
}