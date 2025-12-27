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
const unwrap = <T>(response: any): T | undefined => {
	if (Array.isArray(response) && response.length === 2 && response[0] === null) {
		return response[1] as T;
	}
	return response as T;
};

// Dictionary type for game-indexed data
type GameDataDict<T> = { [gameId: string]: T };

export namespace API {
	export namespace Season {
		// all seasons
		export const GetAllSeasons = async (): Promise<Season[]> => {
			const response = await get<PWHLSeasonsResponse>(Paths.PWHL.Season.All());
			return response.SiteKit.Seasons;
		};

		// latest regular season
		export const GetLatestRegularSeason = async (): Promise<Season | undefined> => {
			const seasons = await GetAllSeasons();
			return seasons
				.filter((season) => season.career === "1" && season.playoff === "0")
				.sort((a, b) => b.season_id.localeCompare(a.season_id))?.[0];
		};

		// latest season ID
		export const GetLatestSeasonId = async (): Promise<string> => {
			const seasons = await GetAllSeasons();
			const currentSeason = seasons.sort((a, b) => b.season_id.localeCompare(a.season_id))[0];
			return currentSeason.season_id;
		};
	}

	export namespace Teams {
		// all teams in specific season or latest
		export const GetTeamsBySeason = async (seasonId?: string): Promise<Team[]> => {
			const sid = seasonId ?? (await Season.GetLatestSeasonId());
			const response = await get<PWHLTeamsResponse>(Paths.PWHL.Teams.BySeasonId(sid));
			return response.SiteKit.Teamsbyseason;
		};

		// team roster for a specific season or latest
		export const GetRoster = async (teamId: string, seasonId?: string) => {
			const sid = seasonId ?? (await Season.GetLatestSeasonId());
			const response = await get<PWHLRosterResponse>(Paths.PWHL.Teams.Roster(teamId, sid));
			return response.SiteKit.Roster;
		};

		// find team by code in specific season or latest
		export const GetTeamByCode = async (teamCode: string, seasonId?: string): Promise<Team | undefined> => {
			const teams = await GetTeamsBySeason(seasonId);
			return teams.find((team) => team.code.toUpperCase() === teamCode.toUpperCase());
		};
	}

	export namespace Schedule {
		// all games in specific season or latest
		export const GetSeasonSchedule = async (seasonId?: string) => {
			const sid = seasonId ?? (await Season.GetLatestSeasonId());
			const response = await get<PWHLScheduleResponse>(Paths.PWHL.Schedule.BySeason(sid));
			return response.SiteKit.Schedule;
		};

		// schedule for a team in latest season
		export const GetTeamSchedule = async (teamId: string, seasonId?: string) => {
			const sid = seasonId ?? (await Season.GetLatestSeasonId());
			const response = await get<PWHLScheduleResponse>(Paths.PWHL.Schedule.ByTeam(teamId, sid));
			return response.SiteKit.Schedule;
		};

		// top of PWHL.com 'scorebar' game info
		export const GetScorebar = async (daysBack?: number, daysAhead?: number): Promise<Game[]> => {
			const response = await get<PWHLScorebarResponse>(Paths.PWHL.Schedule.Scorebar(daysBack, daysAhead));
			return response.SiteKit.Scorebar;
		};

		// Games that match today's date string
		export const GetTodaysGames = async () => {
			const schedule = await GetSeasonSchedule();
			const zonedNow = utcToZonedTime(new Date(), Config.TIME_ZONE);
			const todayStr = format(zonedNow, "yyyy-MM-dd");
			return schedule.filter((game) => game.date_played === todayStr);
		};

		// Games for a specific date
		export const GetGamesByDate = async (date: Date) => {
			const schedule = await GetSeasonSchedule();
			const dateStr = format(date, "yyyy-MM-dd");
			return schedule.filter((game) => game.date_played === dateStr);
		};
	}
	export namespace Standings {
		export const GetStandings = async (seasonId?: string): Promise<TeamStanding[]> => {
			const sid = seasonId ?? (await Season.GetLatestSeasonId());
			const response = await get<PWHLStandingsResponse>(Paths.PWHL.Standings.Current(sid));
			return response.SiteKit.Statviewtype.filter((item) => !item.repeatheader);
		};
	}
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
	export namespace Live {
		export const GetAllLiveData = async (): Promise<AllLiveDataResponse> => {
			return await get<AllLiveDataResponse>(Paths.PWHL.Live.AllLiveData());
		};

		export async function GetRunningClock(gameId: string): Promise<RunningClockData | undefined>;
		export async function GetRunningClock(): Promise<GameDataDict<RunningClockData>>;
		export async function GetRunningClock(
			gameId?: string,
		): Promise<RunningClockData | GameDataDict<RunningClockData> | undefined> {
			const data = unwrap<RunningClock>(await get(Paths.PWHL.Live.RunningClock()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}

		export async function GetPublishedClock(gameId: string): Promise<PublishedClockData | undefined>;
		export async function GetPublishedClock(): Promise<GameDataDict<PublishedClockData>>;
		export async function GetPublishedClock(
			gameId?: string,
		): Promise<PublishedClockData | GameDataDict<PublishedClockData> | undefined> {
			const data = unwrap<PublishedClock>(await get(Paths.PWHL.Live.PublishedClock()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}

		export async function GetGoals(gameId: string): Promise<GameGoalsData | undefined>;
		export async function GetGoals(): Promise<GameDataDict<GameGoalsData>>;
		export async function GetGoals(
			gameId?: string,
		): Promise<GameGoalsData | GameDataDict<GameGoalsData> | undefined> {
			const data = unwrap<Goals>(await get(Paths.PWHL.Live.Goals()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}

		export async function GetPenalties(gameId: string): Promise<GamePenaltyData | undefined>;
		export async function GetPenalties(): Promise<GameDataDict<GamePenaltyData>>;
		export async function GetPenalties(
			gameId?: string,
		): Promise<GamePenaltyData | GameDataDict<GamePenaltyData> | undefined> {
			const data = unwrap<Penalties>(await get(Paths.PWHL.Live.Penalties()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}

		export async function GetShotsSummary(gameId: string): Promise<GameShotsSummaryData | undefined>;
		export async function GetShotsSummary(): Promise<GameDataDict<GameShotsSummaryData>>;
		export async function GetShotsSummary(
			gameId?: string,
		): Promise<GameShotsSummaryData | GameDataDict<GameShotsSummaryData> | undefined> {
			const data = unwrap<ShotSummary>(await get(Paths.PWHL.Live.ShotsSummary()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}

		export async function GetFaceoffs(gameId: string): Promise<GameFaceoffsData | undefined>;
		export async function GetFaceoffs(): Promise<GameDataDict<GameFaceoffsData>>;
		export async function GetFaceoffs(
			gameId?: string,
		): Promise<GameFaceoffsData | GameDataDict<GameFaceoffsData> | undefined> {
			const data = unwrap<Faceoffs>(await get(Paths.PWHL.Live.Faceoffs()));
			if (!gameId) {
				return data?.games || {};
			}
			return data?.games?.[gameId];
		}
	}
}
