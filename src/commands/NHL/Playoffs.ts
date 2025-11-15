import utcToZonedTime from "date-fns-tz/utcToZonedTime";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { max } from "underscore";
import { Command } from "../../models/Command";
import { API } from "../../service/NHL/API";
import { Seed } from "../../service/NHL/models/PlayoffCarouselResponse";
import { Colors, Config } from "../../utils/constants";
import { EmojiCache } from "../../utils/EmojiCache";

export const PlayoffBracket: Command = {
    name: "playoffs",
    description: "Show current NHL playoff series info",
    slashCommandDescription: new SlashCommandBuilder(),
    executeSlashCommand: async (interaction) => {
        await interaction.deferReply();
        // current season
        const season = await API.Seasons.GetLatest();
        // carousel
        const playoffs = await API.Playoffs.GetPlayoffCarousel(`${season}`);
        const { rounds, currentRound: currentRoundNumber } = playoffs;

        const currentRound =
            rounds.find((round) => round.roundNumber === currentRoundNumber) ?? rounds[playoffs.rounds.length - 1];
        const { series } = currentRound;
        const fields = await Promise.all(
            series.map(async (series) => {
                const { bottomSeed, topSeed, seriesLetter } = series;
                const leader = max([topSeed, bottomSeed], (seed) => seed.wins) as Seed;
                const loser = topSeed.id === leader.id ? bottomSeed : topSeed;

                const leaderEmoji = EmojiCache.getNHLTeamEmoji(leader.abbrev) || "";
                const loserEmoji = EmojiCache.getNHLTeamEmoji(loser.abbrev) || "";

                const description =
                    bottomSeed.wins === topSeed.wins
                        ? `Series tied ${topSeed.wins} - ${bottomSeed.wins}`
                        : `${leader.abbrev} ${leader.wins === 4 ? "Wins" : "leads"} ${leader.wins} - ${loser.wins}`;

                // series over
                if (leader.wins === 4) {
                    return {
                        name: `${leaderEmoji} ${leader.abbrev} vs ${loser.abbrev} ${loserEmoji}`,
                        value: `**${description}**`,
                    };
                }

                const seriesDetails = await API.Playoffs.GetPlayoffSeries(`${season}`, seriesLetter.toLowerCase());
                const gameNum = loser.wins + leader.wins + 1;
                const { games } = seriesDetails;
                const game = games.find((game) => game.gameNumber === gameNum) ?? games[games.length - 1];

                // in case games is empty
                if (!game) {
                    return {
                        name: `${leaderEmoji} ${leader.abbrev} vs ${loser.abbrev} ${loserEmoji}`,
                        value: `**${description}**\nGame ${gameNum} - TBD`,
                    };
                }

                const gameDate = utcToZonedTime(game.startTimeUTC, Config.TIME_ZONE);
                const gameDateString = gameDate.toLocaleString("en-US", {
                    weekday: "short",
                    month: "numeric",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                });
                const gameTime = gameDateString.replace("AM", "am").replace("PM", "pm");
                const gameVenue = game.venue.default;

                return {
                    name: `${leaderEmoji} ${leader.abbrev} vs ${loser.abbrev} ${loserEmoji}`,
                    value: `${description}\nGame ${gameNum} - ${gameTime}\n${gameVenue}`,
                };
            })
        );

        const embed = new EmbedBuilder()
            .setTitle(`NHL Playoffs`)
            .setDescription(`Round ${currentRoundNumber}`)
            .addFields(fields)
            .setColor(Colors.KRAKEN_EMBED);
        await interaction.followUp({
            embeds: [embed],
        });
    },
};
