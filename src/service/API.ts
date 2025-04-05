import { max } from "underscore";
import { Paths } from "../utils/constants";
import { ApiDateString, get } from "../utils/helpers";
import { PlayerSearchResult } from "./models/responses/Common";
import { Game as DayScheduleGame, DayScheduleResponse } from "./models/responses/DaySchedule";
import { DefaultStandingsResponse, Standing } from "./models/responses/DefaultStandingsResponse";
import { GameBoxScoreResponse } from "./models/responses/GameBoxScoreResponse";
import { PlayByPlayResponse } from "./models/responses/PlayByPlayResponse";
import { PlayerStatsSummary } from "./models/responses/PlayerStatsSummaryResponse";
import { PlayoffBracketResponse } from "./models/responses/PlayoffBracketResponse";
import { PlayoffCarouselResponse } from "./models/responses/PlayoffCarouselResponse";
import { PlayoffSeriesResponse } from "./models/responses/PlayoffSeriesResponse";
import { ScoreboardResponse } from "./models/responses/ScoreboardResponse";
import { Game as ScoresGame, ScoresResponse } from "./models/responses/ScoresResponse";
import { StatsSeason, TeamSeasonStatsResponse } from "./models/responses/StatsResponses";
import { StoryResponse } from "./models/responses/StoryResponse";
import {
    Game as MonthlyScheduleGame,
    TeamMonthlyScheduleResponse,
} from "./models/responses/TeamMonthlyScheduleResponse";
import { TeamRestResponse } from "./models/responses/TeamRestResponse";
import { Player, TeamRosterResponse } from "./models/responses/TeamRosterResponse";
import { TeamSummary, TeamSummaryResponse } from "./models/responses/TeamSummaryResponse";
import { TeamWeeklyScheduleResponse, Game as WeeklyScheduleGame } from "./models/responses/TeamWeeklyScheduleResponse";

export module API {
    export module Schedule {
        export const GetDailySchedule: (date?: Date) => Promise<DayScheduleGame[]> = async (date) => {
            const dateInput = date && date instanceof Date ? ApiDateString(date) : undefined;
            const response = await get<DayScheduleResponse>(Paths.NHL.Schedule.AllGames(dateInput));
            return response.gameWeek[0].games;
        };
        export const GetTeamWeeklySchedule: (team: string) => Promise<WeeklyScheduleGame[]> = async (team) => {
            const response = await get<TeamWeeklyScheduleResponse>(Paths.NHL.Schedule.TeamWeeklySchedule(team));
            return response.games;
        };
        export const GetTeamMonthlySchedule: (team: string) => Promise<MonthlyScheduleGame[]> = async (team) => {
            const response = await get<TeamMonthlyScheduleResponse>(Paths.NHL.Schedule.TeamMonthlySchedule(team));
            return response.games;
        };
        export const GetTeamSeasonSchedule: (team: string) => Promise<MonthlyScheduleGame[]> = async (team) => {
            const response = await get<TeamMonthlyScheduleResponse>(Paths.NHL.Schedule.TeamSeasonSchedule(team));
            return response.games;
        };
    }
    export module Teams {
        export const GetCurrentRosterSeason: (team: string) => Promise<number> = async (team) => {
            const response = await get<number[]>(Paths.NHL.Teams.RosterSeasons(team));
            return max(response);
        };
        export const GetCurrentRoster: (team: string) => Promise<Player[]> = async (team) => {
            const season = await GetCurrentRosterSeason(team);
            const response = await get<TeamRosterResponse>(Paths.NHL.Teams.Roster(team, season));
            return [...response.forwards, ...response.defensemen, ...response.goalies];
        };

        // https://api.nhle.com/stats/rest/en/team/?cayenneExp=triCode=%22SEA%22
        export const GetTeamID: (team: string) => Promise<number> = async (team) => {
            const response = await get<TeamRestResponse>(Paths.NHL.Rest.TeamInfoByTriCode(team));
            return response.data?.[0]?.id;
        };

        // https://api.nhle.com/stats/rest/en/team/summary?cayenneExp=seasonId=20232024%20and%20teamId=55
        export const GetTeamSummary: (team: string, season?: string) => Promise<TeamSummary> = async (
            team,
            season?
        ) => {
            const summaries = await GetTeamSummaries(season);
            const teamId = await GetTeamID(team);
            return summaries.filter((summary) => summary.teamId == teamId)?.[0];
        };
        export const GetTeamSummaries: (season?: string) => Promise<TeamSummary[]> = async (season?) => {
            if (!season) {
                season = `${await Seasons.GetLatest()}`;
            }
            const summaries = await get<TeamSummaryResponse>(Paths.NHL.Rest.AllTeamSummaries(season));
            return summaries.data;
        };
    }
    export module Standings {
        export const GetStandings: () => Promise<Standing[]> = async () => {
            const response = await get<DefaultStandingsResponse>(Paths.NHL.Standings.CurrentStandings);
            return response?.standings;
        };
    }
    export module Games {
        export const GetScoreboard: (team?: string) => Promise<ScoreboardResponse> = async (team?) => {
            const response = await get<ScoreboardResponse>(Paths.NHL.Games.Scoreboard(team));
            return response;
        };
        // https://api-web.nhle.com/v1/score/now
        export const GetGames: (date?: Date) => Promise<ScoresGame[]> = async (date?) => {
            const dateInput = date && date instanceof Date ? ApiDateString(date) : undefined;
            const response = await get<ScoresResponse>(Paths.NHL.Games.ByDate(dateInput));
            return response?.games;
        };
        export const GetBoxScore: (id: string) => Promise<GameBoxScoreResponse> = async (id) => {
            const response = await get<GameBoxScoreResponse>(Paths.NHL.Games.Live.Game(id).BoxScore);
            return response;
        };
        export const GetPlays: (id: string) => Promise<PlayByPlayResponse> = async (id) => {
            const response = await get<PlayByPlayResponse>(Paths.NHL.Games.Live.Game(id).PlayByPlay);
            return response;
        };
        export const GetStory: (id: string) => Promise<StoryResponse> = async (id) => {
            const response = await get<StoryResponse>(Paths.NHL.Games.Story(id));
            return response;
        };
    }
    export module Stats {
        export const GetSeasons: (team: string) => Promise<StatsSeason[]> = async (team) => {
            const response = await get<StatsSeason[]>(Paths.NHL.Stats.StatSeasons(team));
            return response;
        };
        export const GetLatestSeason: (team: string) => Promise<StatsSeason> = async (team) => {
            const response = await GetSeasons(team);
            return response?.[0];
        };
        export const GetTeamPlayerStatsForSeason: (
            team: string,
            season?: string,
            playoffs?: boolean
        ) => Promise<TeamSeasonStatsResponse> = async (team, season, playoffs) => {
            if (!season) {
                season = (await GetLatestSeason(team)).season;
            }
            const response = await get<TeamSeasonStatsResponse>(
                Paths.NHL.Stats.TeamSeasonPlayerStats(team, season, playoffs)
            );
            return response;
        };

        export const GetPlayerStatsSummary: (player: string) => Promise<PlayerStatsSummary> = async (player) => {
            const response = await get<PlayerStatsSummary>(Paths.NHL.Stats.PlayerStatsSummary(player));
            return response;
        };

        export const GetPlayerGameLog: (player: string) => Promise<PlayerStatsSummary> = async (player) => {
            const response = await get<PlayerStatsSummary>(Paths.NHL.Stats.PlayerGameLog(player));
            return response;
        };
    }

    export module Playoffs {
        export const GetPlayoffSeries: (season: string, series: string) => Promise<PlayoffSeriesResponse> = async (
            season,
            series
        ) => {
            const response = await get<PlayoffSeriesResponse>(Paths.NHL.Playoffs.Series(season, series));
            return response;
        };
        export const GetPlayoffBracket: (year: string) => Promise<PlayoffBracketResponse> = async (year) => {
            const response = await get<PlayoffBracketResponse>(Paths.NHL.Playoffs.Bracket(year));
            return response;
        };
        export const GetPlayoffCarousel: (season: string) => Promise<PlayoffCarouselResponse> = async (season) => {
            const response = await get<PlayoffCarouselResponse>(Paths.NHL.Playoffs.Carousel(season));
            return response;
        };
    }

    export module Search {
        export const Player: (query: string) => Promise<PlayerSearchResult[]> = async (query) => {
            const response = await get<PlayerSearchResult[]>(Paths.NHL.Search.Player(query));
            return response;
        };
    }
    export module Seasons {
        export const GetAll: () => Promise<number[]> = async () => {
            const response = await get<number[]>(Paths.NHL.Seasons.All);
            return response;
        };
        export const GetLatest: () => Promise<number> = async () => {
            const seasons = await GetAll();
            return max(seasons);
        };
    }
}
