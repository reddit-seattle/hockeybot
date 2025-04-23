import { format } from "date-fns";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";
import { API } from "../../service/NHL/API";
import { Game } from "../../service/NHL/models/ScoresResponse";
import { Config } from "../../utils/constants";
import { GameState, PeriodType } from "../../utils/enums";
import {
    hasGameStarted,
    isGameOver,
    optionalDateOption,
    periodToStr,
    processLocalizedDateInput,
} from "../../utils/helpers";

export const GetScores: Command = {
    name: "scores",
    description: "Get game scores",
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
        if (!liveGames?.length) {
            await interaction.followUp({ content: "No live games found", ephemeral: true });
            return;
        }
        const fields = await Promise.all(
            liveGames.map(async (game) => {
                const { gameState, awayTeam, homeTeam, gameOutcome } = game;
                const appEmojis = await interaction.client.application.emojis.fetch();
                const awayTeamEmoji =
                    appEmojis.find((emoji) => emoji.name === awayTeam.abbrev.toUpperCase()) ?? awayTeam.abbrev;
                const homeTeaEmoji =
                    appEmojis.find((emoji) => emoji.name === homeTeam.abbrev.toUpperCase()) ?? homeTeam.abbrev;
                // score is undefined ? 'teamname teamemoji' : 'score - teamname teamemoji'
                const away = `${awayTeamEmoji} ${awayTeam.abbrev}${
                    game.awayTeam.score == undefined ? "" : ` - ${game.awayTeam.score}`
                }`;
                const home = `${homeTeaEmoji} ${homeTeam.abbrev}${
                    game.homeTeam.score == undefined ? "" : ` - ${game.homeTeam.score}`
                }`;

                const gameScoreLine = `${away}\n${home}`;
                let detailsLineItems = [];

                // pregame checks
                if (gameState == GameState.pregame) {
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
                    const { lastPeriodType } = gameOutcome;
                    if (lastPeriodType != PeriodType.regulation) {
                        detailsLineItems = [`Final (${lastPeriodType})`, ...detailsLineItems];
                    }
                    if (game.threeMinRecap) {
                        detailsLineItems.push(`[Video Recap](https://nhl.com${game.threeMinRecap})`);
                    }
                } else {
                    const { clock, periodDescriptor } = game;
                    if (periodDescriptor) {
                        const { number, periodType } = periodDescriptor;

                        detailsLineItems = [
                            ` (${clock.timeRemaining} ${periodToStr(number, periodType)})`,
                            ...detailsLineItems,
                        ];
                    }
                }
                const details = detailsLineItems.join("\n");
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
