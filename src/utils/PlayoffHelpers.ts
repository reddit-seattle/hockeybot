import { max } from "underscore";
import { API } from "../service/NHL/API";
import { PlayoffCarouselResponse, Round, Series } from "../service/NHL/models/PlayoffCarouselResponse";
import { DayScheduleResponse } from "../service/NHL/models/DaySchedule";
import { GameType } from "./enums";
import { Logger } from "./Logger";

/**
 * Contextual playoff series information for a single matchup
 */
export interface PlayoffSeriesContext {
	roundName: string;
	roundNumber: number;
	topSeedAbbrev: string;
	bottomSeedAbbrev: string;
	topSeedWins: number;
	bottomSeedWins: number;
	seriesLetter: string;
	isSeriesOver: boolean;
	winnerAbbrev?: string;
}

// Cached carousel data to avoid redundant API calls within a single cycle
let cachedCarousel: PlayoffCarouselResponse | null = null;
let cachedSeason: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Checks whether the current date falls within the NHL playoff window
 * by inspecting the DayScheduleResponse metadata.
 */
export const isPlayoffPeriod = (scheduleResponse: DayScheduleResponse): boolean => {
	const { regularSeasonEndDate, playoffEndDate } = scheduleResponse;
	if (!regularSeasonEndDate || !playoffEndDate) return false;

	const now = new Date();
	const regEnd = new Date(regularSeasonEndDate);
	const playoffEnd = new Date(playoffEndDate);

	return now > regEnd && now <= playoffEnd;
};

/**
 * Checks if a game is a playoff game based on its gameType
 */
export const isPlayoffGame = (gameType: number): boolean => {
	return gameType === GameType.playoffs;
};

/**
 * Fetches the playoff carousel for the current season, with caching.
 */
export const getPlayoffCarousel = async (): Promise<PlayoffCarouselResponse | null> => {
	try {
		const now = Date.now();
		if (cachedCarousel && cachedSeason && now - cacheTimestamp < CACHE_TTL_MS) {
			return cachedCarousel;
		}

		const season = await API.Seasons.GetLatest();
		const carousel = await API.Playoffs.GetPlayoffCarousel(`${season}`);
		cachedCarousel = carousel;
		cachedSeason = `${season}`;
		cacheTimestamp = now;
		return carousel;
	} catch (error) {
		Logger.error("Error fetching playoff carousel:", error);
		return cachedCarousel; // return stale cache on error
	}
};

/**
 * Clears the carousel cache (useful for testing or forced refresh)
 */
export const clearPlayoffCache = (): void => {
	cachedCarousel = null;
	cachedSeason = null;
	cacheTimestamp = 0;
};

/**
 * Returns all rounds that have at least one series with activity
 * (any series where topSeed.wins + bottomSeed.wins > 0, or has a winningTeamId)
 */
export const getActiveRounds = (carousel: PlayoffCarouselResponse): Round[] => {
	return carousel.rounds.filter((round) =>
		round.series.some(
			(series) => series.topSeed.wins + series.bottomSeed.wins > 0 || series.winningTeamId > 0,
		),
	);
};

/**
 * Builds playoff series context for a game, given the teams involved.
 * Searches the carousel for a matching series.
 */
export const getSeriesContextForGame = async (
	homeTeamId: number,
	awayTeamId: number,
): Promise<PlayoffSeriesContext | null> => {
	const carousel = await getPlayoffCarousel();
	if (!carousel) return null;

	for (const round of carousel.rounds) {
		for (const series of round.series) {
			const teamIds = [series.topSeed.id, series.bottomSeed.id];
			if (teamIds.includes(homeTeamId) && teamIds.includes(awayTeamId)) {
				return buildSeriesContext(round, series);
			}
		}
	}
	return null;
};

/**
 * Builds a PlayoffSeriesContext from carousel round and series data
 */
export const buildSeriesContext = (round: Round, series: Series): PlayoffSeriesContext => {
	const { topSeed, bottomSeed } = series;
	const leader = (max([topSeed, bottomSeed], (s) => s.wins)) as typeof topSeed;
	const isOver = leader.wins >= series.neededToWin;

	return {
		roundName: round.roundLabel,
		roundNumber: round.roundNumber,
		topSeedAbbrev: topSeed.abbrev,
		bottomSeedAbbrev: bottomSeed.abbrev,
		topSeedWins: topSeed.wins,
		bottomSeedWins: bottomSeed.wins,
		seriesLetter: series.seriesLetter,
		isSeriesOver: isOver,
		winnerAbbrev: isOver ? leader.abbrev : undefined,
	};
};

/**
 * Formats a series context into a short display string.
 * @param ctx Series context data
 * @param options.nextGame When true, labels the next game to be played (for schedule/upcoming).
 *                         When false/omitted, shows only the series status (for scores/live).
 * Examples:
 *   "1st-round — SEA leads 3-1"
 *   "1st-round, Game 5 — SEA leads 3-1"  (with nextGame)
 *   "1st-round — SEA won 4-2"
 *   "1st-round — Series tied 0-0"
 */
export const formatSeriesContextLine = (ctx: PlayoffSeriesContext, options?: { nextGame?: boolean }): string => {
	if (ctx.isSeriesOver) {
		return `${ctx.roundName} — ${ctx.winnerAbbrev} won ${Math.max(ctx.topSeedWins, ctx.bottomSeedWins)}-${Math.min(ctx.topSeedWins, ctx.bottomSeedWins)}`;
	}

	const leader = ctx.topSeedWins > ctx.bottomSeedWins ? ctx.topSeedAbbrev : ctx.bottomSeedAbbrev;
	const seriesDescription =
		ctx.topSeedWins === ctx.bottomSeedWins
			? `Series tied ${ctx.topSeedWins}-${ctx.bottomSeedWins}`
			: `${leader} leads ${Math.max(ctx.topSeedWins, ctx.bottomSeedWins)}-${Math.min(ctx.topSeedWins, ctx.bottomSeedWins)}`;

	if (options?.nextGame) {
		const nextGameNum = ctx.topSeedWins + ctx.bottomSeedWins + 1;
		return `${ctx.roundName}, Game ${nextGameNum} — ${seriesDescription}`;
	}

	return `${ctx.roundName} — ${seriesDescription}`;
};
