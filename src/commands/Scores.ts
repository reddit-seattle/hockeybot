import { Command } from "../models/Command";
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import { API } from "../service/API";
import { hasGameStarted, isGameOver, optionalDateOption, periodToStr } from "../utils/helpers"

export const GetScores: Command = {
    name: 'scores',
    description: 'Get game scores',
    // TODO - add date
    slashCommandDescription:
        new SlashCommandBuilder()
            .addStringOption(optionalDateOption),
    executeSlashCommand: async (interaction) => {

        const dateInput = interaction.options.getString("date", false) ?? undefined;
        const date = dateInput ? new Date(dateInput) : undefined;
        await interaction.deferReply();

        // get all games for date
        const games = await API.Games.GetGames(date);
        if(!games?.length) {
            await interaction.followUp(`No hockey ${dateInput ? `on ${dateInput}` :'today'} :(`);
            return;
        }

        // filter games that have already started
        const liveGames = games.filter(game => hasGameStarted(game.gameState));
        const fields = await Promise.all(liveGames.map(async (game) => {

            const { id, gameState, awayTeam, homeTeam, gameOutcome } = game;
            let gameScoreLine = `${awayTeam.abbrev} - ${awayTeam.score}  @  ${homeTeam.abbrev} - ${homeTeam.score}`
            let detailsLine = `Shots ${game.awayTeam.abbrev}: ${game.awayTeam.sog}, ${game.homeTeam.abbrev}: ${game.homeTeam.sog}`
            detailsLine += `\n[NHL Gamecenter](https://nhl.com${game.gameCenterLink})`;
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
                if(periodDescriptor){
                    const { number, periodType} = periodDescriptor;

                    gameScoreLine += ` (${clock.timeRemaining} ${periodToStr(number, periodType)})`
                }
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