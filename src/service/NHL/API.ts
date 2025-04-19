import { max } from "underscore";
import { Paths } from "../../utils/constants";
import { ApiDateString, get } from "../../utils/helpers";
import { PlayerSearchResult } from "./models/Common";
import { DayScheduleResponse } from "./models/DaySchedule";
import { DefaultStandingsResponse } from "./models/DefaultStandingsResponse";
import { GameBoxScoreResponse } from "./models/GameBoxScoreResponse";
import { PlayByPlayResponse } from "./models/PlayByPlayResponse";
import { PlayerStatsSummary } from "./models/PlayerStatsSummaryResponse";
import { PlayoffBracketResponse } from "./models/PlayoffBracketResponse";
import { PlayoffCarouselResponse } from "./models/PlayoffCarouselResponse";
import { PlayoffSeriesResponse } from "./models/PlayoffSeriesResponse";
import { ScoreboardResponse } from "./models/ScoreboardResponse";
import { ScoresResponse } from "./models/ScoresResponse";
import { StatsSeason, TeamSeasonStatsResponse } from "./models/StatsResponses";
import { StoryResponse } from "./models/StoryResponse";
import { TeamMonthlyScheduleResponse } from "./models/TeamMonthlyScheduleResponse";
import { TeamRestResponse } from "./models/TeamRestResponse";
import { TeamRosterResponse } from "./models/TeamRosterResponse";
import { TeamSummaryResponse } from "./models/TeamSummaryResponse";
import { TeamWeeklyScheduleResponse } from "./models/TeamWeeklyScheduleResponse";

export namespace API {
    export namespace Schedule {
        export const GetDailySchedule = async (date?: Date) => {
            const dateInput = date && date instanceof Date ? ApiDateString(date) : undefined;
            const response = await get<DayScheduleResponse>(Paths.NHL.Schedule.AllGames(dateInput));
            return response.gameWeek[0].games;
        };
        export const GetTeamWeeklySchedule = async (team: string) => {
            const response = await get<TeamWeeklyScheduleResponse>(Paths.NHL.Schedule.TeamWeeklySchedule(team));
            return response.games;
        };
        export const GetTeamMonthlySchedule = async (team: string) => {
            const response = await get<TeamMonthlyScheduleResponse>(Paths.NHL.Schedule.TeamMonthlySchedule(team));
            return response.games;
        };
        export const GetTeamSeasonSchedule = async (team: string) => {
            const response = await get<TeamMonthlyScheduleResponse>(Paths.NHL.Schedule.TeamSeasonSchedule(team));
            return response.games;
        };
    }
    export namespace Teams {
        export const GetCurrentRosterSeason = async (team: string) => {
            const response = await get<number[]>(Paths.NHL.Teams.RosterSeasons(team));
            return max(response);
        };
        export const GetCurrentRoster = async (team: string) => {
            const season = await GetCurrentRosterSeason(team);
            const response = await get<TeamRosterResponse>(Paths.NHL.Teams.Roster(team, season));
            return [...response.forwards, ...response.defensemen, ...response.goalies];
        };

        // https://api.nhle.com/stats/rest/en/team/?cayenneExp=triCode=%22SEA%22
        export const GetTeamID = async (team: string) => {
            const response = await get<TeamRestResponse>(Paths.NHL.Rest.TeamInfoByTriCode(team));
            return response.data?.[0]?.id;
        };

        // https://api.nhle.com/stats/rest/en/team/summary?cayenneExp=seasonId=20232024%20and%20teamId=55
        export const GetTeamSummary = async (team: string, season?: string) => {
            const summaries = await GetTeamSummaries(season);
            const teamId = await GetTeamID(team);
            return summaries.filter((summary) => summary.teamId == teamId)?.[0];
        };
        export const GetTeamSummaries = async (season?: string) => {
            if (!season) {
                season = `${await Seasons.GetLatest()}`;
            }
            const summaries = await get<TeamSummaryResponse>(Paths.NHL.Rest.AllTeamSummaries(season));
            return summaries.data;
        };
    }
    export namespace Standings {
        export const GetStandings = async () => {
            const response = await get<DefaultStandingsResponse>(Paths.NHL.Standings.CurrentStandings);
            return response?.standings;
        };
    }
    export namespace Games {
        export const GetScoreboard = async (team?: string) => {
            const response = await get<ScoreboardResponse>(Paths.NHL.Games.Scoreboard(team));
            return response;
        };
        // https://api-web.nhle.com/v1/score/now
        export const GetGames = async (date?: Date) => {
            const dateInput = date && date instanceof Date ? ApiDateString(date) : undefined;
            const response = await get<ScoresResponse>(Paths.NHL.Games.ByDate(dateInput));
            return response?.games;
        };
        export const GetBoxScore = async (id: string) => {
            const response = await get<GameBoxScoreResponse>(Paths.NHL.Games.Live.Game(id).BoxScore);
            return response;
        };
        export const GetPlays = async (id: string) => {
            const response = await get<PlayByPlayResponse>(Paths.NHL.Games.Live.Game(id).PlayByPlay);
            return response;
        };
        export const GetStory = async (id: string) => {
            const response = await get<StoryResponse>(Paths.NHL.Games.Story(id));
            return response;
        };
    }
    export namespace Stats {
        export const GetSeasons = async (team: string) => {
            const response = await get<StatsSeason[]>(Paths.NHL.Stats.StatSeasons(team));
            return response;
        };
        export const GetLatestSeason = async (team: string) => {
            const response = await GetSeasons(team);
            return response?.[0];
        };
        export const GetTeamPlayerStatsForSeason = async (team: string, season?: string, playoffs?: boolean) => {
            if (!season) {
                season = (await GetLatestSeason(team)).season;
            }
            const response = await get<TeamSeasonStatsResponse>(
                Paths.NHL.Stats.TeamSeasonPlayerStats(team, season, playoffs)
            );
            return response;
        };

        export const GetPlayerStatsSummary = async (player: string) => {
            const response = await get<PlayerStatsSummary>(Paths.NHL.Stats.PlayerStatsSummary(player));
            return response;
        };

        export const GetPlayerGameLog = async (player: string) => {
            const response = await get<PlayerStatsSummary>(Paths.NHL.Stats.PlayerGameLog(player));
            return response;
        };
    }

    export namespace Playoffs {
        export const GetPlayoffSeries = async (season: string, series: string) => {
            const response = await get<PlayoffSeriesResponse>(Paths.NHL.Playoffs.Series(season, series));
            return response;
        };
        export const GetPlayoffBracket = async (year: string) => {
            const response = await get<PlayoffBracketResponse>(Paths.NHL.Playoffs.Bracket(year));
            return response;
        };
        export const GetPlayoffCarousel = async (season: string) => {
            const response = await get<PlayoffCarouselResponse>(Paths.NHL.Playoffs.Carousel(season));
            return response;
        };
    }

    export namespace Search {
        export const Player = async (query: string) => {
            const response = await get<PlayerSearchResult[]>(Paths.NHL.Search.Player(query));
            return response;
        };
    }
    export namespace Seasons {
        export const GetAll = async () => {
            const response = await get<number[]>(Paths.NHL.Seasons.All);
            return response;
        };
        export const GetLatest = async () => {
            const seasons = await GetAll();
            return max(seasons);
        };
    }
}
