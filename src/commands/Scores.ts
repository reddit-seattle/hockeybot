import { Command } from "../models/Command";
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { API } from "../service/API";
import {
    hasGameStarted,
    isGameOver,
    optionalDateOption,
    periodToStr,
    processLocalizedDateInput,
} from "../utils/helpers";
import { addHours, format } from "date-fns";
import { Config } from "../utils/constants";
import { Game } from "../service/models/responses/ScoresResponse";
import { GameState } from "../utils/enums";

export const GetScores: Command = {
    name: "scores",
    description: "Get game scores",
    // TODO - add date
    slashCommandDescription: new SlashCommandBuilder().addStringOption(optionalDateOption),
    executeSlashCommand: async (interaction) => {
        await interaction.deferReply();
        let title = `Scores`;
        const dateInput = interaction.options.getString("date", false);
        const adjustedDate = processLocalizedDateInput(dateInput);
        let games: Game[] = [];
        // get all games for date
        if (adjustedDate) {
            title = `${title} for ${format(adjustedDate, Config.TITLE_DATE_FORMAT)}`;
            games = await API.Games.GetGames(adjustedDate);
        } else {
            games = await API.Games.GetGames();
        }
        if (!games?.length) {
            await interaction.followUp(
                `No hockey ${adjustedDate ? `on ${format(adjustedDate, Config.TITLE_DATE_FORMAT)}` : "today"} :(`
            );
            return;
        }

        // filter games that have already started
        const liveGames = games.filter((game) => hasGameStarted(game.gameState));
        if(!liveGames?.length) {
            await interaction.followUp({content: "No live games found", ephemeral: true});
            return;
        }
        const fields = await Promise.all(
            liveGames.map(async (game) => {
                const { id, gameState, awayTeam, homeTeam, gameOutcome } = game;
                const away = `${awayTeam.abbrev}${awayTeam.score == undefined ? `` : ` - ${awayTeam.score ?? 0}`}`;
                const home = `${homeTeam.abbrev}${homeTeam.score == undefined ? `` : ` - ${homeTeam.score ?? 0}`}`;
                let gameScoreLine = `${away} @ ${home}`;
                let detailsLineItems = [];

                // pregame checks
                if(gameState == GameState.pregame){
                    detailsLineItems.push(`Pregame`);
                }
                // any state but "future"
                else if (hasGameStarted(gameState)) {
                    const away = `${game.awayTeam.abbrev}: ${game.awayTeam.sog ?? 0}`;
                    const home = `${game.homeTeam.abbrev}: ${game.homeTeam.sog ?? 0}`;
                    const shotline = `Shots - ${away}, ${home}`;
                    detailsLineItems.push(shotline);
                }

                //always show gamecenter link
                detailsLineItems.push(`[NHL Gamecenter](https://nhl.com${game.gameCenterLink})`);

                // gamestate of 'final, official', etc
                if (isGameOver(gameState)) {
                    gameScoreLine += ` (${gameOutcome.lastPeriodType})`;
                    if (game.threeMinRecap) {
                        detailsLineItems.push(`[Video Recap](https://nhl.com${game.threeMinRecap})`);
                    }

                    const { boxscore } = await API.Games.GetBoxScore(`${id}`);
                    const { gameReports } = boxscore;
                    if (gameReports.shiftChart) {
                        detailsLineItems.push(`[Shift Chart](${gameReports.shiftChart})`);
                    }
                } else {
                    const { clock, periodDescriptor } = game;
                    if (periodDescriptor) {
                        const { number, periodType } = periodDescriptor;

                        gameScoreLine += ` (${clock.timeRemaining} ${periodToStr(number, periodType)})`;
                    }
                }
                const details = detailsLineItems.join('\n');
                return {
                    name: gameScoreLine,
                    value: details,
                    inline: false,
                };
            })
        );
        await interaction.followUp({
            embeds: [new EmbedBuilder().setTitle(title).addFields(fields)],
        });
    },
};
