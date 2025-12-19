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
			return seasons.find((season) => {
				const isRegularSeason = season.career === "1" && season.playoff === "0";
				const startDate = new Date(season.start_date);
				const endDate = new Date(season.end_date);
				const isActive = today >= startDate && today <= endDate;
				return isRegularSeason && isActive;
			});
		};

		/**
		 * Get the current season ID (regular season)
		 */
		export const GetCurrentSeasonId = async (): Promise<string> => {
			const currentSeason = await GetCurrentRegularSeason();
			if (!currentSeason) {
				throw new Error("Could not determine current PWHL regular season");
			}
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
			const teams: Team[] = [];
			response.SiteKit.Teamsbydivision.forEach((division) => {
				teams.push(...division.teams);
			});
			return teams;
		};

		export const GetRoster = async (teamId: string, seasonId?: string) => {
			const sid = seasonId ?? (await Season.GetCurrentSeasonId());
			const response = await get<PWHLRosterResponse>(Paths.PWHL.Teams.Roster(teamId, sid));
			return response.SiteKit.Roster;
		};

		export const GetTeamByCode = async (teamCode: string, seasonId?: string): Promise<Team | undefined> => {
			const teams = await GetTeamsBySeason(seasonId);
			return teams.find((team) => team.team_code.toUpperCase() === teamCode.toUpperCase());
		};
	}

	/**
	 * Schedule and game information
	 */
	export namespace Schedule {
		export const GetSeasonSchedule = async (seasonId?: string) => {
			const sid = seasonId ?? (await Season.GetCurrentSeasonId());
			const response = await get<PWHLScheduleResponse>(Paths.PWHL.Schedule.BySeason(sid));
			return response.SiteKit.Schedule;
		};

		export const GetTeamSchedule = async (teamId: string, seasonId?: string) => {
			const sid = seasonId ?? (await Season.GetCurrentSeasonId());
			const response = await get<PWHLScheduleResponse>(Paths.PWHL.Schedule.ByTeam(teamId, sid));
			return response.SiteKit.Schedule;
		};

		export const GetScorebar = async (daysBack?: number, daysAhead?: number): Promise<Game[]> => {
			const response = await get<PWHLScorebarResponse>(Paths.PWHL.Schedule.Scorebar(daysBack, daysAhead));
			return response.SiteKit.Scorebar;
		};

		/**
		 * Get games for today
		 */
		export const GetTodaysGames = async (): Promise<Game[]> => {
			const allGames = await GetScorebar(1, 1);
			const zonedNow = utcToZonedTime(new Date(), Config.TIME_ZONE);
			const todayStr = format(zonedNow, "yyyy-MM-dd");

			return allGames.filter((game) => {
				const gameDate = new Date(game.GameDateISO8601);
				const zonedGameDate = utcToZonedTime(gameDate, Config.TIME_ZONE);
				const gameDateStr = format(zonedGameDate, "yyyy-MM-dd");
				return gameDateStr === todayStr;
			});
		};

		/**
		 * Get games for a specific date
		 */
		export const GetGamesByDate = async (date: Date): Promise<Game[]> => {
			const allGames = await GetScorebar(365, 365); // Get a year's worth
			const targetDate = date.toISOString().split("T")[0];
			return allGames.filter((game) => game.GameDateISO8601.startsWith(targetDate));
		};
	}

	/**
	 * Standings information
	 */
	export namespace Standings {
		export const GetStandings = async (seasonId?: string): Promise<TeamStanding[]> => {
			const sid = seasonId ?? (await Season.GetCurrentSeasonId());
			const response = await get<PWHLStandingsResponse>(Paths.PWHL.Standings.Current(sid));
			const standings: TeamStanding[] = [];
			response.SiteKit.Statviewtype.sections.forEach((section) => {
				section.data.forEach((item) => {
					standings.push(item.row);
				});
			});
			return standings;
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
}
