import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { max, min } from "underscore";
import { Command } from "../../models/Command";
import { API } from "../../service/NHL/API";
import { Seed } from "../../service/NHL/models/PlayoffCarouselResponse";
import { Colors, Config } from "../../utils/constants";
import utcToZonedTime from "date-fns-tz/utcToZonedTime";

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
        const roundFields = await Promise.all(
            playoffs.rounds.map(async (round) => {
                const { series } = round;
                return await Promise.all(
                    series.map(async (series) => {
                        const { bottomSeed, topSeed } = series;
                        const leader = max([topSeed, bottomSeed], (seed) => seed.wins) as Seed;
                        const loser = topSeed.id === leader.id ? bottomSeed : topSeed;

                        const description =
                            series.bottomSeed.wins === series.topSeed.wins
                                ? `Series tied ${topSeed.wins} - ${bottomSeed.wins}`
                                : `${leader.abbrev} ${leader.wins === 4 ? "Wins" : "Leads"} ${leader.wins} - ${
                                      loser.wins
                                  }`;
                        const appEmojis = await interaction.client.application.emojis.fetch();
                        const leaderEmoji =
                            appEmojis.find((emoji) => emoji.name === leader.abbrev.toUpperCase()) ?? leader.abbrev;
                        const loserEmoji =
                            appEmojis.find((emoji) => emoji.name === loser.abbrev.toUpperCase()) ?? loser.abbrev;

                        const seriesDetails = await API.Playoffs.GetPlayoffSeries(
                            `${season}`,
                            series.seriesLetter.toLowerCase()
                        );
                        const gameNum = leader.wins + loser.wins;
                        const game = seriesDetails.games[min([gameNum, 6])];
                        const gameDate = utcToZonedTime(game.startTimeUTC, Config.TIME_ZONE);
                        // sat. 2/23 @ 2:00 pm, climate arena
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
                            value: `${description}\n${gameNum == 7 ? "Final" : `Game ${gameNum+1} - ${gameTime}\n${gameVenue}`}`, // TODO - add next game date
                        };
                    })
                );
            })
        );

        const fields = roundFields.reduce((acc, val) => acc.concat(val), []);
        const embed = new EmbedBuilder()
            .setTitle(`NHL Playoffs`)
            .setDescription(`Round ${playoffs.currentRound}`)
            .addFields(fields)
            .setColor(Colors.KRAKEN_EMBED);
        await interaction.followUp({
            embeds: [embed],
        });
    },
};
