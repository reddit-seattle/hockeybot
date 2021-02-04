import dotenv from 'dotenv';
import { Interface } from 'readline';
import { StandingsTypes } from '../models/StandingsTypes';
dotenv.config();

export module Config {
    export const prefix: string = '$nhl';
}

export module Environment {
    export const botToken = process.env['bot_token'] || undefined;
    export const DEBUG = process.env['hockeybotDEBUG'] || undefined;
}

export enum EventTypes {
    Goal = 'GOAL'
}
export enum GameStates {
    FINAL = '7',
    FINAL_PENDING = '6',
    GAME_OVER = '5',
    IN_PROGRESS_CRIT = '4',
    IN_PROGRESS = '3',
    PRE_GAME = '2',
    PREVIEW = '1'
}
export enum PlayerTypes {
    Scorer = 'Scorer',
    Shooter = 'Shooter',
    Goalie = 'Goalie'
}

export enum StatsTypes {
    yearByYear = "yearByYear",
    yearByYearRank = "yearByYearRank",
    yearByYearPlayoffs = "yearByYearPlayoffs",
    yearByYearPlayoffsRank = "yearByYearPlayoffsRank",
    careerRegularSeason = "careerRegularSeason",
    careerPlayoffs = "careerPlayoffs",
    gameLog = "gameLog",
    playoffGameLog = "playoffGameLog",
    vsTeam = "vsTeam",
    vsTeamPlayoffs = "vsTeamPlayoffs",
    vsDivision = "vsDivision",
    vsDivisionPlayoffs = "vsDivisionPlayoffs",
    vsConference = "vsConference",
    vsConferencePlayoffs = "vsConferencePlayoffs",
    byMonth = "byMonth",
    byMonthPlayoffs = "byMonthPlayoffs",
    byDayOfWeek = "byDayOfWeek",
    byDayOfWeekPlayoffs = "byDayOfWeekPlayoffs",
    homeAndAway = "homeAndAway",
    homeAndAwayPlayoffs = "homeAndAwayPlayoffs",
    winLoss = "winLoss",
    winLossPlayoffs = "winLossPlayoffs",
    onPaceRegularSeason = "onPaceRegularSeason",
    regularSeasonStatRankings = "regularSeasonStatRankings",
    playoffStatRankings = "playoffStatRankings",
    goalsByGameSituation = "goalsByGameSituation",
    goalsByGameSituationPlayoffs = "goalsByGameSituationPlayoffs",
    statsSingleSeason = "statsSingleSeason",
    statsSingleSeasonPlayoffs = "statsSingleSeasonPlayoffs"
}

export module Kraken {
    export const TeamId: string = Environment.DEBUG ? '4' : '55';
}

export interface Record {
    Wins: number;
    Losses: number;
    Overtime: number;
}

export module Paths {
    export const API_HOST_URL: string = `https://statsapi.web.nhl.com`;
    export const API_PART: string = 'api/v1';
    export const API_ENDPOINT = `${API_HOST_URL}/${API_PART}`;
    
    export module Get {
        export const Schedule: string = `${API_ENDPOINT}/schedule?expand=schedule.linescore`;
        export const ScheduleByDate:(startDate: string, endDate?: string) => string = 
            (start, end) => `${Schedule}&startDate=${start}&endDate=${end || start}`;

        export const TeamSchedule: (id: string) => string =
            (id) => `${Schedule}&teamId=${id}`;
    
        export const TeamScheduleByDate :(team: string, startDate: string, endDate?: string) => string =
            (id, start, end) => `${Schedule}&teamId=${id}&startDate=${start}&endDate=${end || start}`;

        export const Teams: string = `${API_ENDPOINT}/teams`;
        export const Team:(id: string) => string = (id) => `${Paths.Get.Teams}/${id}`;

        export const Divisions: string = `${API_ENDPOINT}/divisions`;
        export const Division: (id: string) => string =
            (id) => `${Paths.Get.Divisions}/${id}`;

        export const Conferences: string = `${API_ENDPOINT}/conferences`;
        export const Conference: (id: string) => string =
            (id) => `${Paths.Get.Conferences}/${id}`;
        
        export const People: string = `${API_ENDPOINT}/people`;
        export const Person:(id: string) => string =
            (id) => `${Paths.Get.People}/${id}`;
        export const PersonSeasonStats:(id: string) => string =
            (id) => `${Person(id)}/stats?stats=${StatsTypes.statsSingleSeason}`;

        export const Seasons: string = `${API_ENDPOINT}/seasons`;
        
        export const TeamStats: (id: string) => string =
            (id) => `${Team(id)}/stats`;

        export const Roster: (id: string) => string =
            (id) => `${Team(id)}/roster`;
        export const Standings: string = `${API_ENDPOINT}/standings`;
        export const CustomStandings: (type: StandingsTypes) => string =
            (type) => `${Standings}/${type}`;

        export const GameFeed: (id: string) => string = (id) => `${API_ENDPOINT}/game/${id}/feed/live`;
        export const GameFeedDiff: (id: string, timecode: string) => string =
            (id, timecode) => `${API_ENDPOINT}/game/${id}/feed/live/diffPatch?startTimecode=${timecode}`;
    }

}