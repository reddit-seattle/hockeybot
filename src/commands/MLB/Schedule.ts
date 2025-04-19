import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { Command } from "../../models/Command";
import { API } from "../../service/MLB/API";
import { Colors, TeamIds } from "../../utils/constants";

export const Mariners: Command = {
    name: "mariners",
    description: "Next Mariners Games",
    /**
     * Command to perform MLB schedule / scores lookup
     * // command groups:
     * // - schedule - next X games
     * // - scores
     * // - standings
     */
    slashCommandDescription: new SlashCommandBuilder()
        .addSubcommand((subcommand) =>
            subcommand
                .setName("next")
                .setDescription("Get next Mariners games")
                .addIntegerOption((option) =>
                    option
                        .setName("number")
                        .setDescription("Number of games to return")
                        .setRequired(false)
                        .setChoices(
                            { name: "1", value: 1 },
                            { name: "3", value: 3 },
                            { name: "5", value: 5 },
                            { name: "10", value: 10 }
                        )
                )
        )
        .addSubcommand((cmd) =>
            cmd
                .setName("scores")
                .setDescription("Get today's MLB scores")
                .addBooleanOption((option) => option.setName("all").setDescription("Show all scores?"))
        ),
    // .addSubcommand((cmd) =>
    //     cmd
    //         .setName("standings")
    //         .setDescription("Mariners standings")
    //         .addStringOption((option) =>
    //             option
    //                 .setName("type")
    //                 .setDescription("Standings type")
    //                 .setChoices(
    //                     { name: "division", value: "division" },
    //                     { name: "league", value: "league" },
    //                     { name: "all", value: "all" }
    //                 )
    //         )
    // )
    executeSlashCommand: async (interaction) => {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case "next":
                const number = interaction.options.getInteger("number", false);
                const nextGames = await API.Schedule.TeamNext(TeamIds.Mariners, number ?? 1);
                if (nextGames.length == 0) {
                    await interaction.followUp("No games found");
                    return;
                }
                const nextGamesEmbed = new EmbedBuilder()
                    .setTitle(`Next Mariners Game${nextGames.length > 1 ? "s" : ""}`)
                    .setDescription(
                        nextGames
                            .map((game) => {
                                const date = new Date(game.gameDate);
                                const isHomeGame = game.teams.home.team.id == TeamIds.Mariners;
                                const vsString = isHomeGame ? "vs" : " @";
                                const opponent = isHomeGame ? game.teams.away.team.name : game.teams.home.team.name;
                                const formattedDate = date.toLocaleString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                });
                                return `**${vsString} ${opponent}**\n${formattedDate}\n`;
                            })
                            .join("\n")
                    )
                    .setColor(Colors.MARINERS); // Green color for Mariners
                await interaction.followUp({ embeds: [nextGamesEmbed] });
                break;
            case "scores":
                const allTeams = interaction.options.getBoolean("all", false);
                const teamId = allTeams ? undefined : TeamIds.Mariners;
                const games = await API.Schedule.Today(teamId);
                if (games.length == 0) {
                    await interaction.followUp(`No games today`);
                    return;
                }
                const fields = [];
                for (const game of games) {
                    const { gamePk } = game;
                    const { home, away } = game.teams;
                    const gameFeed = await API.LiveGames.ById(gamePk);
                    fields.push({
                        name: `${home.score ?? 0} - ${home.team.name}\n${away.score ?? 0} - ${away.team.name}`,
                        value:
                            game.status.abstractGameCode === "F"
                                ? game.status.detailedState
                                : `${gameFeed.liveData.linescore.inningHalf} ${gameFeed.liveData.linescore.currentInningOrdinal}`,
                    });
                }

                const gamesEmbed = new EmbedBuilder()
                    .setTitle(`Today's ${allTeams ? "MLB" : "Mariners"} Scores`)
                    .setDescription(
                        new Date().toLocaleString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                        })
                    )
                    .addFields(fields)
                    .setColor(Colors.MARINERS); // Green color for Mariners
                await interaction.followUp({ embeds: [gamesEmbed] });
                break;
            // case "standings":
            //     await interaction.followUp("todo");
            //     break;
        }
    },
};
