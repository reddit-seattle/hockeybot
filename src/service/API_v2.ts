import { Paths_V2 } from "../utils/constants";
import { ApiDateString, get } from '../utils/helpers';
import { DayScheduleResponse, Game as DayScheduleGame } from './models/responses_v2/DaySchedule';
import { TeamWeeklyScheduleResponse, Game as WeeklyScheduleGame } from './models/responses_v2/TeamWeeklyScheduleResponse';
import { TeamMonthlyScheduleResponse, Game as MonthlyScheduleGame } from './models/responses_v2/TeamMonthlyScheduleResponse';
import { DefaultStandingsResponse, Standing } from './models/responses_v2/DefaultStandingsResponse';
import { ScoresResponse, Game as ScoresGame } from './models/responses_v2/ScoresResponse';
import { GameBoxScoreResponse } from './models/responses_v2/GameBoxScoreResponse';
import { PlayByPlayResponse } from './models/responses_v2/PlayByPlayResponse';
import { Player, TeamRosterResponse } from "./models/responses_v2/TeamRosterResponse";
import { ScoreboardResponse } from "./models/responses_v2/ScoreboardResponse";
import { StatsSeason, TeamSeasonStatsResponse } from "./models/responses_v2/StatsResponses";
import { max, reduceRight } from "underscore";
import { PlayerStatsSummary } from "./models/responses_v2/PlayerStatsSummaryResponse";



export module API {

    export module Schedule {
        export const GetDailySchedule: (date?: Date) => Promise<DayScheduleGame[]> = 
            async (date) => {
                const dateInput = (date && date instanceof Date) ? ApiDateString(date) : undefined;
                const response = await get<DayScheduleResponse>(Paths_V2.Schedule.AllGames(dateInput));
                return response.gameWeek[0].games
            }
        export const GetTeamWeeklySchedule: (team: string) => Promise<WeeklyScheduleGame[]> =
            async (team) => {
                const response = await get<TeamWeeklyScheduleResponse>(Paths_V2.Schedule.TeamWeeklySchedule(team));
                return response.games;
            }
        export const GetTeamMonthlySchedule: (team: string) => Promise<MonthlyScheduleGame[]> =
            async (team) => {
                const response = await get<TeamMonthlyScheduleResponse>(Paths_V2.Schedule.TeamMonthlySchedule(team));
                return response.games;
            }
        export const GetTeamSeasonSchedule: (team: string) => Promise<MonthlyScheduleGame[]> =
            async (team) => {
                const response = await get<TeamMonthlyScheduleResponse>(Paths_V2.Schedule.TeamSeasonSchedule(team));
                return response.games;
            }
        

    }
    export module Teams {
        export const GetCurrentRosterSeason: (team: string) => Promise<number> =
            async (team) => {
                const response = await get<number[]>(Paths_V2.Teams.RosterSeasons(team));
                return max(response);
            }
        export const GetCurrentRoster: (team: string) => Promise<Player[]> =
            async (team) => {
                const season = await GetCurrentRosterSeason(team);
                const response = await get<TeamRosterResponse>(Paths_V2.Teams.Roster(team, season));
                return [...response.forwards, ...response.defensemen, ...response.goalies];
            }

    }
    export module Standings {
        export const GetStandings: () => Promise<Standing[]> = async () => {
            const response = await get<DefaultStandingsResponse>(Paths_V2.Standings.CurrentStandings);
            return response?.standings;
        }
    }
    export module Games {
        export const GetScoreboard: (team?: string) => Promise<ScoreboardResponse> = async (team?) => {
            const response = await get<ScoreboardResponse>(Paths_V2.Games.Scoreboard(team));
            return response;
            
        }
        // https://api-web.nhle.com/v1/score/now
        export const GetGames: (date?: Date) => Promise<ScoresGame[]> = async (date?) => {
            const dateInput = (date && date instanceof Date) ? ApiDateString(date) : undefined;
            const response = await get<ScoresResponse>(Paths_V2.Games.ByDate(dateInput));
            return response?.games;
        }
       export const GetBoxScore: (id: string) => Promise<GameBoxScoreResponse> = async (id) => {
            const response = await get<GameBoxScoreResponse>(Paths_V2.Games.Live.Game(id).BoxScore)
            return response;
        }
        export const GetPlays: (id: string) => Promise<PlayByPlayResponse> = async (id) => {
            const response = await get<PlayByPlayResponse>(Paths_V2.Games.Live.Game(id).PlayByPlay)
            return response;
        }

    }
    export module Stats {
        export const GetSeasons: (team: string) => Promise<StatsSeason[]> = async (team) => {
            const response = await get<StatsSeason[]>(Paths_V2.Stats.StatSeasons(team));
            return response;

        }
        export const GetLatestSeason: (team: string) => Promise<StatsSeason> = async (team) => {
            const response = await GetSeasons(team);
            return response?.[0];
        }
        export const GetTeamStatsForSeason: (team: string, season?: string, playoffs?: boolean) => Promise<TeamSeasonStatsResponse> = async (team, season, playoffs) => {
            if(!season) {
                season = (await GetLatestSeason(team)).season;
            }
            const response = await get<TeamSeasonStatsResponse>(Paths_V2.Stats.TeamSeasonStats(team, season, playoffs));
            return response;
        }

        export const GetPlayerStatsSummary: (player: string) => Promise<PlayerStatsSummary> = async(player) => {
            const response = await get<PlayerStatsSummary>(Paths_V2.Stats.PlayerStatsSummary(player));
            return response;
        }

        export const GetPlayerGameLog: (player: string) => Promise<PlayerStatsSummary> = async(player) => {
            const response = await get<PlayerStatsSummary>(Paths_V2.Stats.PlayerGameLog(player));
            return response;
        }
    
    }
}