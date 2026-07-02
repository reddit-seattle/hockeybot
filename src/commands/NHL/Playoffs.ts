import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { max } from "underscore";
import { Command } from "../../models/Command";
import { API } from "../../service/NHL/API";
import { Seed } from "../../service/NHL/models/PlayoffCarouselResponse";
import { Colors, Config, Strings } from "../../utils/constants";
import { EmojiCache } from "../../utils/EmojiCache";
import { getActiveRounds } from "../../utils/PlayoffHelpers";

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

		// Get all rounds with active or completed series
		const activeRounds = getActiveRounds(playoffs);

		if (activeRounds.length === 0) {
			await interaction.followUp("No active playoff series found.");
			return;
		}

		// Build one embed with all active rounds
		const allFields: Array<{ name: string; value: string; inline?: boolean }> = [];

		for (const round of activeRounds) {
			const { series, roundLabel } = round;

			// Round header separator
			allFields.push({
				name: `── ${roundLabel} ──`,
				value: Strings.ZERO_WIDTH_SPACE,
			});

			const seriesFields = await Promise.all(
				series.map(async (series) => {
					const { bottomSeed, topSeed, seriesLetter } = series;
					const leader = max([topSeed, bottomSeed], (seed) => seed.wins) as Seed;
					const loser = topSeed.id === leader.id ? bottomSeed : topSeed;

					const leaderEmoji = EmojiCache.getNHLTeamEmoji(leader.abbrev) || "";
					const loserEmoji = EmojiCache.getNHLTeamEmoji(loser.abbrev) || "";

					// Series over
					if (leader.wins >= series.neededToWin) {
						return {
							name: `${leaderEmoji} ${leader.abbrev} vs ${loser.abbrev} ${loserEmoji}`,
							value: `**${leaderEmoji} ${leader.abbrev} wins ${leader.wins}-${loser.wins}**`,
						};
					}

					const description =
						bottomSeed.wins === topSeed.wins
							? `Series tied ${topSeed.wins}-${bottomSeed.wins}`
							: `${leader.abbrev} leads ${leader.wins}-${loser.wins}`;

					const seriesDetails = await API.Playoffs.GetPlayoffSeries(`${season}`, seriesLetter.toLowerCase());
					const gameNum = loser.wins + leader.wins + 1;
					const { games } = seriesDetails;
					const game = games.find((game) => game.gameNumber === gameNum) ?? games[games.length - 1];

					if (!game) {
						return {
							name: `${leaderEmoji} ${leader.abbrev} vs ${loser.abbrev} ${loserEmoji}`,
							value: `${description}\nGame ${gameNum} - TBD`,
						};
					}

					const gameTime = new Date(game.startTimeUTC)
						.toLocaleString("en-US", {
							weekday: "short",
							month: "numeric",
							day: "numeric",
							hour: "numeric",
							minute: "2-digit",
							hour12: true,
							timeZone: Config.TIME_ZONE,
						})
						.replace("AM", "am")
						.replace("PM", "pm");
					const gameVenue = game.venue.default;

					return {
						name: `${leaderEmoji} ${leader.abbrev} vs ${loser.abbrev} ${loserEmoji}`,
						value: `${description}\nGame ${gameNum} - ${gameTime}\n${gameVenue}`,
					};
				}),
			);

			allFields.push(...seriesFields);
		}

		const embed = new EmbedBuilder()
			.setTitle(`NHL Playoffs`)
			.addFields(allFields)
			.setColor(Colors.KRAKEN_EMBED);
		await interaction.followUp({
			embeds: [embed],
		});
	},
};
