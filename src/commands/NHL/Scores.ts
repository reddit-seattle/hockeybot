import { format } from "date-fns";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";
import { API } from "../../service/NHL/API";
import { Game } from "../../service/NHL/models/ScoresResponse";
import { Config } from "../../utils/constants";
import { EmojiCache } from "../../utils/EmojiCache";
import { GameState, PeriodType } from "../../utils/enums";
import {
    hasGameStarted,
    isGameInProgress,
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
                const awayTeamEmoji = EmojiCache.getTeamEmoji(awayTeam.abbrev);
                const homeTeamEmoji = EmojiCache.getTeamEmoji(homeTeam.abbrev);
                // emoji formatting
                const awayTeamString = awayTeamEmoji ? `${awayTeamEmoji} ${awayTeam.abbrev}` : awayTeam.abbrev;
                const homeTeamString = homeTeamEmoji ? `${homeTeamEmoji} ${homeTeam.abbrev}` : homeTeam.abbrev;
                // scores are undefined for pregame, so no need to show them
                const awayScoreString = awayTeam.score == undefined ? "" : ` - ${awayTeam.score}`;
                const homeScoreString = homeTeam.score == undefined ? "" : ` - ${homeTeam.score}`;

                const away = `${awayTeamString}${awayScoreString}`;
                const home = `${homeTeamString}${homeScoreString}`;

                const gameScoreLine = `${away}\n${home}`;
                let detailsLineItems = [];

                // pregame checks
                if (gameState == GameState.pregame) {
                    detailsLineItems.push(`Pregame`);
                } else if (isGameInProgress(gameState)) {
                    const awayShots = `${awayTeamEmoji || homeTeam.abbrev} ${game.awayTeam.sog ?? 0}`;
                    const homeShots = `${homeTeamEmoji || homeTeam.abbrev} ${game.homeTeam.sog ?? 0}`;
                    const shotline = `Shots: ${awayShots} ${homeShots}`;
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
