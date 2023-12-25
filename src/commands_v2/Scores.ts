import { Command } from "../models/Command";
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import { API } from "../service/API_v2";
import { GameScheduleState, GameState, PeriodType } from "../utils/enums";
import { GameStates } from "../utils/constants";

const periodToStr = (number: number, periodType: string) => {
    if(periodType == PeriodType.regulation) {
        switch (number) {
            case 1: return '1st';
            case 2: return '2nd';
            case 3: return '3rd';
            default: return number;
        }
    }
    else {
        switch (number) {
            case 4: return 'OT'
            case 5: return periodType == PeriodType.overtime ? '2OT' : 'SO'
            case 6: return '3OT'
            case 7: return '4OT'
            case 8: return '5OT'
            case 9: return '6OT'
            default: return number
        }
    }
}

const isGameOver = (gameState: string) => {
    return ([
        GameState.hardFinal,
        GameState.softFinal,
        GameState.official
    ] as string[]).includes(gameState);
}

export const GetCurrentScores: Command = {
    name: 'scoresv2',
    description: 'Get current game scores',
    // TODO - add date
    slashCommandDescription: new SlashCommandBuilder(),
    executeSlashCommand: async (interaction) => {
        await interaction.deferReply();
        const games = await API.Games.GetGames();
        if(!games?.length) {
            await interaction.followUp("No hockey today :(");
            return;
        }
        const fields = await Promise.all(games.map(async (game) => {
            const { id, gameState, awayTeam, homeTeam, gameOutcome } = game;
            let gameScoreLine = `${awayTeam.abbrev} - ${awayTeam.score}  @  ${homeTeam.abbrev} - ${homeTeam.score}`
            let detailsLine = `Shots ${game.awayTeam.abbrev}: ${game.awayTeam.sog}, ${game.homeTeam.abbrev}: ${game.homeTeam.sog}`
            detailsLine += `\n[NHL Gamecenter](https://nhl.com${game.gameCenterLink})`;
            // TODO - filter whether game is live or not and add clock / period info
            if(isGameOver(gameState)){
                gameScoreLine += ` (${gameOutcome.lastPeriodType})`
                if(game.threeMinRecap) {
                    detailsLine += `\n` + `[Video Recap](https://nhl.com${game.threeMinRecap})`
                }
                
                const { boxscore } = await API.Games.GetBoxScore(`${id}`);
                const { gameReports } = boxscore;
                if(gameReports.shiftChart) {
                    detailsLine += `\n` + `[Shift Chart](${gameReports.shiftChart})`
                }
            }
            else {
                const { clock, periodDescriptor } = game;
                const { number, periodType} = periodDescriptor;

                gameScoreLine += ` (${clock.timeRemaining} ${periodToStr(number, periodType)})`
            }

            return {
                name: gameScoreLine,
                value: detailsLine,
                inline: false
            }
        }));
        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Scores")
                    .addFields(fields)
            ]
        });
    }
}