import { EmbedBuilder } from "discord.js";
import { Game } from "../service/NHL/models/DaySchedule";
import { Colors, Config, Strings } from "./constants";
import { EmojiCache } from "./EmojiCache";
import {
	formatSeriesContextLine,
	getSeriesContextForGame,
	isPlayoffGame,
	PlayoffSeriesContext,
} from "./PlayoffHelpers";
import { isGameOver, hasGameStarted, relativeDateString, ApiDateString } from "./helpers";
import { GameState } from "./enums";

/**
 * Builds a daily summary embed for all playoff games on a given day.
 * Groups games by round and includes series context.
 */
export const PlayoffDailySummaryEmbedBuilder = async (games: Game[]): Promise<EmbedBuilder | undefined> => {
	if (games.length === 0) {
		return undefined;
	}
	const playoffGames = games.filter((game) => isPlayoffGame(game.gameType));

	// Build series context for each game
	const gamesWithContext: Array<{ game: Game; context: PlayoffSeriesContext | null }> = await Promise.all(
		playoffGames.map(async (game) => ({
			game,
			context: await getSeriesContextForGame(game.homeTeam.id, game.awayTeam.id),
		})),
	);

	// Group by round number
	const roundGroups = new Map<number, Array<{ game: Game; context: PlayoffSeriesContext | null }>>();
	for (const item of gamesWithContext) {
		const roundNum = item.context?.roundNumber ?? 0;
		if (!roundGroups.has(roundNum)) {
			roundGroups.set(roundNum, []);
		}
		roundGroups.get(roundNum)!.push(item);
	}

	// Sort rounds by number
	const sortedRounds = Array.from(roundGroups.entries()).sort(([a], [b]) => a - b);

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	for (const [, items] of sortedRounds) {
		const roundName = items[0]?.context?.roundName ?? "Playoffs";

		// Add round header as a field
		fields.push({
			name: `── ${roundName} ──`,
			value: Strings.ZERO_WIDTH_SPACE,
			inline: false,
		});

		for (const { game, context } of items) {
			const { awayTeam, homeTeam, startTimeUTC, venue, gameState } = game;

			const awayEmoji = EmojiCache.getNHLTeamEmoji(awayTeam.abbrev);
			const homeEmoji = EmojiCache.getNHLTeamEmoji(homeTeam.abbrev);
			const awayDisplay = awayEmoji ? `${awayEmoji} ${awayTeam.abbrev}` : awayTeam.abbrev;
			const homeDisplay = homeEmoji ? `${homeTeam.abbrev} ${homeEmoji}` : homeTeam.abbrev;

			const title = `${awayDisplay} @ ${homeDisplay}`;

			const lines: string[] = [];

			// Series context — show "Game X" only for upcoming games
			if (context) {
				const isUpcoming = !hasGameStarted(gameState) || gameState === GameState.future;
				lines.push(`*${formatSeriesContextLine(context, { nextGame: isUpcoming })}*`);
			}

			if (isGameOver(gameState)) {
				// Show final score
				const awayScore = game.awayTeam.score ?? 0;
				const homeScore = game.homeTeam.score ?? 0;
				const otSuffix = game.gameOutcome?.lastPeriodType !== "REG" ? ` (${game.gameOutcome?.lastPeriodType})` : "";
				lines.push(`**Final${otSuffix}: ${awayTeam.abbrev} ${awayScore} - ${homeTeam.abbrev} ${homeScore}**`);
			} else if (hasGameStarted(gameState) && gameState !== GameState.future) {
				// In progress
				const awayScore = game.awayTeam.score ?? 0;
				const homeScore = game.homeTeam.score ?? 0;
				lines.push(`**Live**: ${awayTeam.abbrev} ${awayScore} - ${homeTeam.abbrev} ${homeScore}`);
			} else {
				// Upcoming game
				const timeStr = new Date(startTimeUTC)
						.toLocaleTimeString("en-US", Config.LOCAL_TIME_DISPLAY_OPTIONS)
						.replace("AM", "am")
						.replace("PM", "pm");
				lines.push(`${relativeDateString(startTimeUTC)} — ${timeStr}`);
				lines.push(venue.default);
			}

			fields.push({
				name: title,
				value: lines.join("\n"),
				inline: false,
			});
		}
	}

	return new EmbedBuilder()
		.setTitle(`Stanley Cup Playoffs games on ${ApiDateString(new Date())}`)
		.addFields(fields)
		.setColor(Colors.KRAKEN_EMBED);
};
