import { format, utcToZonedTime } from "date-fns-tz";
import { Config, Paths } from "../../utils/constants";
import { get } from "../../utils/helpers";
import { PWHLGameSummaryResponse } from "./models/GameSummaryResponse";
import { PWHLRosterResponse } from "./models/RosterResponse";
import { PWHLScheduleResponse } from "./models/ScheduleResponse";
import { Game, PWHLScorebarResponse } from "./models/ScorebarResponse";
import { PWHLStandingsResponse, TeamStanding } from "./models/StandingsResponse";
import { PWHLTeamsResponse, Team } from "./models/TeamsResponse";
import { PWHLSeasonsResponse, Season } from "./models/SeasonsResponse";
import { PlayByPlayResponse } from "./models/PlayByPlayResponse";
import {
	AllLiveDataResponse,
	Goals,
	Penalties,
	Faceoffs,
	PublishedClockData,
	RunningClockData,
	GameGoalsData,
	GamePenaltyData,
	GameShotsSummaryData,
	GameFaceoffsData,
	RunningClock,
	PublishedClock,
	ShotSummary,
} from "./models/LiveGameResponse";

// Firebase returns [null, data] - helper to extract data at index 1
// If response is [null, T], unwrap it. Otherwise return as-is.
const extractFirebaseValue = <T>(response: any): T | undefined => {
	if (Array.isArray(response) && response.length === 2 && response[0] === null) {
		return response[1] as T;
	}
	return response as T;
};

export namespace API {
	/**
	 * Season information
	 */
	export namespace Season {
		export const GetAllSeasons = async (): Promise<Season[]> => {
			const response = await get<PWHLSeasonsResponse>(Paths.PWHL.Season.All());
			return response.SiteKit.Seasons;
		};

		/**
		 * Get the current regular season (career=1, playoff=0, and current date is within season dates)
		 */
		export const GetCurrentRegularSeason = async (): Promise<Season | undefined> => {
			const seasons = await GetAllSeasons();
			const today = new Date();

			// Find regular season (career=1, playoff=0) where today is between start and end dates
			return seasons
				.filter((season) => season.career === "1" && season.playoff === "0")
				.sort((a, b) => a.season_id.localeCompare(b.season_id))?.[0];
		};

		/**
		 * Get the current season ID (regular season)
		 */
		export const GetCurrentSeasonId = async (): Promise<string> => {
			const seasons = await GetAllSeasons();
			// sort by season_id descending to get the latest season first
			const currentSeason = seasons.sort((a, b) => b.season_id.localeCompare(a.season_id))[0];
			return currentSeason.season_id;
		};
	}

	/**
	 * Get all teams for a given season
	 */
	export namespace Teams {
		export const GetTeamsBySeason = async (seasonId?: string): Promise<Team[]> => {
			const sid = seasonId ?? (await Season.GetCurrentSeasonId());
			const response = await get<PWHLTeamsResponse>(Paths.PWHL.Teams.BySeasonId(sid));
			return response.SiteKit.Teamsbyseason;
		};

		export const GetRoster = async (teamId: string, seasonId?: string) => {
			const sid = seasonId ?? (await Season.GetCurrentSeasonId());
			const response = await get<PWHLRosterResponse>(Paths.PWHL.Teams.Roster(teamId, sid));
			return response.SiteKit.Roster;
		};

		export const GetTeamByCode = async (teamCode: string, seasonId?: string): Promise<Team | undefined> => {
			const teams = await GetTeamsBySeason(seasonId);
			return teams.find((team) => team.code.toUpperCase() === teamCode.toUpperCase());
		};
	}

	/**
	 * Schedule and game information
	 */
	export namespace Schedule {
		/**
		 * Get the full game schedule for a given season
		 */
		export const GetSeasonSchedule = async (seasonId?: string) => {
			const sid = seasonId ?? (await Season.GetCurrentSeasonId());
			const response = await get<PWHLScheduleResponse>(Paths.PWHL.Schedule.BySeason(sid));
			return response.SiteKit.Schedule;
		};

		/**
		 * Get the game schedule for a given team and season
		 */
		export const GetTeamSchedule = async (teamId: string, seasonId?: string) => {
			const sid = seasonId ?? (await Season.GetCurrentSeasonId());
			const response = await get<PWHLScheduleResponse>(Paths.PWHL.Schedule.ByTeam(teamId, sid));
			return response.SiteKit.Schedule;
		};

		/**
		 * Get scorebar information (contains game schedules and scores) - use for live game status
		 */
		export const GetScorebar = async (daysBack?: number, daysAhead?: number): Promise<Game[]> => {
			const response = await get<PWHLScorebarResponse>(Paths.PWHL.Schedule.Scorebar(daysBack, daysAhead));
			return response.SiteKit.Scorebar;
		};

		/**
		 * Get games for today
		 */
		export const GetTodaysGames = async () => {
			const schedule = await GetSeasonSchedule();
			const zonedNow = utcToZonedTime(new Date(), Config.TIME_ZONE);
			const todayStr = format(zonedNow, "yyyy-MM-dd");
			return schedule.filter((game) => game.date_played === todayStr);
		};

		/**
		 * Get games for a specific date
		 */
		export const GetGamesByDate = async (date: Date) => {
			const schedule = await GetSeasonSchedule();
			const dateStr = format(date, "yyyy-MM-dd");
			return schedule.filter((game) => game.date_played === dateStr);
		};
	}

	/**
	 * Standings information
	 */
	export namespace Standings {
		export const GetStandings = async (seasonId?: string): Promise<TeamStanding[]> => {
			const sid = seasonId ?? (await Season.GetCurrentSeasonId());
			const response = await get<PWHLStandingsResponse>(Paths.PWHL.Standings.Current(sid));
			return response.SiteKit.Statviewtype.filter((item) => !item.repeatheader);
		};
	}

	/**
	 * Game details
	 */
	export namespace Games {
		export const GetGameSummary = async (gameId: string) => {
			const response = await get<PWHLGameSummaryResponse>(Paths.PWHL.Games.Summary(gameId));
			return response.GC.Gamesummary;
		};

		export const GetGameClock = async (gameId: string) => {
			// Returns basic game status and clock info
			return await get<any>(Paths.PWHL.Games.Clock(gameId));
		};

		export const GetPlayByPlay = async (gameId: string) => {
			// Returns detailed play-by-play data
			const response = await get<PlayByPlayResponse>(Paths.PWHL.Games.PlayByPlay(gameId));
			return response.GC.Pxpverbose;
		};
	}

	/**
	 * Live game data (play by play)
	 */
	export namespace Live {
		export const GetAllLiveData = async (): Promise<AllLiveDataResponse> => {
			return await get<AllLiveDataResponse>(Paths.PWHL.Live.AllLiveData());
		};

		export const GetRunningClock = async (): Promise<RunningClockData | undefined> => {
			const data = extractFirebaseValue<RunningClock>(await get(Paths.PWHL.Live.RunningClock()));
			return data?.games ? Object.values(data.games)[0] : undefined;
		};

		export async function GetPublishedClock(gameId: string): Promise<PublishedClockData | undefined>;
		export async function GetPublishedClock(): Promise<{ [gameId: string]: PublishedClockData }>;
		export async function GetPublishedClock(
			gameId?: string,
		): Promise<PublishedClockData | { [gameId: string]: PublishedClockData } | undefined> {
			const data = extractFirebaseValue<PublishedClock>(await get(Paths.PWHL.Live.PublishedClock()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}

		export async function GetGoals(gameId: string): Promise<GameGoalsData | undefined>;
		export async function GetGoals(): Promise<{ [gameId: string]: GameGoalsData }>;
		export async function GetGoals(
			gameId?: string,
		): Promise<GameGoalsData | { [gameId: string]: GameGoalsData } | undefined> {
			const data = extractFirebaseValue<Goals>(await get(Paths.PWHL.Live.Goals()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}

		export async function GetPenalties(gameId: string): Promise<GamePenaltyData | undefined>;
		export async function GetPenalties(): Promise<{ [gameId: string]: GamePenaltyData }>;
		export async function GetPenalties(
			gameId?: string,
		): Promise<GamePenaltyData | { [gameId: string]: GamePenaltyData } | undefined> {
			const data = extractFirebaseValue<Penalties>(await get(Paths.PWHL.Live.Penalties()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}

		export async function GetShotsSummary(gameId: string): Promise<GameShotsSummaryData | undefined>;
		export async function GetShotsSummary(): Promise<{ [gameId: string]: GameShotsSummaryData }>;
		export async function GetShotsSummary(
			gameId?: string,
		): Promise<GameShotsSummaryData | { [gameId: string]: GameShotsSummaryData } | undefined> {
			const data = extractFirebaseValue<ShotSummary>(await get(Paths.PWHL.Live.ShotsSummary()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}

		export async function GetFaceoffs(gameId: string): Promise<GameFaceoffsData | undefined>;
		export async function GetFaceoffs(): Promise<{ [gameId: string]: GameFaceoffsData }>;
		export async function GetFaceoffs(
			gameId?: string,
		): Promise<GameFaceoffsData | { [gameId: string]: GameFaceoffsData } | undefined> {
			const data = extractFirebaseValue<Faceoffs>(await get(Paths.PWHL.Live.Faceoffs()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}
	}
}
