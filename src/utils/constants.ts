import dotenv from 'dotenv';
import { StandingsTypes } from '../models/StandingsTypes';
dotenv.config();

export module Config {
    export const TIME_ZONE = "America/Los_Angeles";
}

export module RoleIds {
    export const MOD = '370946173902520342';
}

export module ChannelIds {
    export const DEBUG = '541322708844281867';
    export const KRAKEN = '389864168926216193';
}

export module Strings {
    export const KRAKEN_GAMEDAY_THREAD_TITLE = 'Kraken Game Day Thread';
    export const REDLIGHT_EMBED = '<a:redlight:892194335951581247>';
    export const ZERO_WIDTH_SPACE = '​';
}
export module Environment {
    export const botToken = process.env['bot_token'] || undefined;
    export const DEBUG = process.env['hockeybotDEBUG'] ? true : false;
}

export enum MEDIA_FORMAT {
    FLASH_192K_320X180 = "FLASH_192K_320X180",
    FLASH_450K_384x216 = "FLASH_450K_384x216",
    FLASH_1200K_640X360 = "FLASH_1200K_640X360",
    FLASH_1800K_896x504 = "FLASH_1800K_896x504",
    HTTP_CLOUD_MOBILE = "HTTP_CLOUD_MOBILE",
    HTTP_CLOUD_TABLET = "HTTP_CLOUD_TABLET",
    HTTP_CLOUD_TABLET_60 = "HTTP_CLOUD_TABLET_60",
    HTTP_CLOUD_WIRED = "HTTP_CLOUD_WIRED",
    HTTP_CLOUD_WIRED_60 = "HTTP_CLOUD_WIRED_60",
    HTTP_CLOUD_WIRED_WEB = "HTTP_CLOUD_WIRED_WEB"
}

export enum EventTypes {
    Goal = 'GOAL'
}
export enum GameStates {
    FINAL = "7",
    ALMOST_FINAL = "6",
    GAME_OVER = "5",
    CRITICAL = "4",
    IN_PROGRESS = "3",
    PRE_GAME = "2",
    POSTPONED = "9",
    PREVIEW_TBD = "8",
    PREVIEW = "1"
}
export enum GameTypes {
    PRESEASON = 'PR',
    REGULAR = 'R',
    PLAYOFFS = 'P',
    ALLSTAR = 'A',
    WOMENSALLSTAR = 'WA',
    OLYMPIC = 'O'
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
    export const TeamId: string = '55';
}

export interface Record {
    Wins: number;
    Losses: number;
    Overtime: number;
}

export module Paths_V2 {
  /***
   * All games today:               https://api-web.nhle.com/v1/schedule/now
   * Calendar Schedule?:            https://api-web.nhle.com/v1/schedule-calendar/2023-12-21
   * This week's kraken games:      https://api-web.nhle.com/v1/club-schedule/SEA/week/now
   * This month's kraken games:     https://api-web.nhle.com/v1/club-schedule/SEA/month/now
   * This season's kraken games:    https://api-web.nhle.com/v1/club-schedule-season/SEA/now
   */
  export const API_ENDPOINT = "https://api-web.nhle.com/v1";
  export module Schedule {
    const URL: string = `${API_ENDPOINT}/schedule`;
    const CALENDAR_URL: string = `${URL}-calendar`
    
    export const AllGames: (date?: string) => string = (date?) => `${URL}/${date || "now"}`;
    // TODO - API
    export const ScheduleCalendar: (date?: string) => string = (date?) => `${CALENDAR_URL}/${date || "now"}`;
    export const TeamWeeklySchedule: (abbreviation: string) => string = (
      abbreviation
    ) => `${API_ENDPOINT}/club-schedule/${abbreviation}/week/now`;
    export const TeamMonthlySchedule: (abbreviation: string) => string = (
      abbreviation
    ) => `${API_ENDPOINT}/club-schedule/${abbreviation}/month/now`;
    export const TeamSeasonSchedule: (abbreviation: string) => string = (
      abbreviation
    ) => `${API_ENDPOINT}/club-schedule-season/${abbreviation}/now`;
  }

  export module Teams {
    export const ROSTER_URL = `${API_ENDPOINT}/roster`;
    export const SEASON_URL = `${API_ENDPOINT}/roster-season`;

    // https://api-web.nhle.com/v1/roster-season/sea -> [20212022, 20222023, 20232024]
    export const RosterSeasons = (team: string) => `${SEASON_URL}/${team}`;

    // https://api-web.nhle.com/v1/roster/sea/20232024
    export const Roster = (team: string, season: number) =>
      `${URL}/${team}/${season}`;
  }
  // TODO - API
  export module Stats {
    const STATS_URL = `${API_ENDPOINT}/club-stats`;
    const SEASON_URL = `${API_ENDPOINT}/club-stats-season`;

    // https://api-web.nhle.com/v1/club-stats-season/sea
    export const StatSeasons = (team: string) => `${SEASON_URL}/${team}`;

    // https://api-web.nhle.com/v1/club-stats/sea/now
    export const TeamCurrentStats = (team: string) =>
      `${STATS_URL}/${team}/now`;

    // https://api-web.nhle.com/v1/club-stats/sea/20232024/2
    export const TeamSeasonStats = (
      team: string,
      season: string,
      playoffs?: boolean
    ) => `${STATS_URL}/${team}/${season}/${playoffs ? 3 : 2}`;

    // https://api-web.nhle.com/v1/player/8475831/landing
    export const PlayerStatsSummary = (player: string) => `${API_ENDPOINT}/player/${player}/landing`;
    // https://api-web.nhle.com/v1/player/8475831/game-log/now
    export const PlayerGameLog = (player: string) => `${API_ENDPOINT}/player/${player}/game-log/now`;
  }
  export module Standings {
    // `https://api-web.nhle.com/v1/standings-season`; // can be used for  different year's standings values, whether they allow ties / wildcards etc
    // `https://api-web.nhle.com/v1/standings/now`;
    const URL = `${API_ENDPOINT}/standings`;
    export const CurrentStandings = `${URL}/now`;
  
  }
  export module Games {
    const SCORE_URL = `${API_ENDPOINT}/score`;
    const SCOREBOARD_URL = `${API_ENDPOINT}/scoreboard`;

    // https://api-web.nhle.com/v1/scoreboard/sea/now
    export const Scoreboard = (team?: string) => `${SCOREBOARD_URL}/${team ?? ''}/now`;
    // Today's games: https://api-web.nhle.com/v1/score/now
    // Dated games:   https://api-web.nhle.com/v1/score/2023-10-19
    export const ByDate: (date?: string) => string = (date) =>
      `${SCORE_URL}/${date || "now"}`;
    export module Live {
      export const URL = `${API_ENDPOINT}/gamecenter`;
      export const Game = (id: string) => {
        const GAME_URL = `${URL}/${id}`;
        return {
          // https://api-web.nhle.com/v1/gamecenter/2023020495/boxscore
          BoxScore: `${GAME_URL}/boxscore`,
          // https://api-web.nhle.com/v1_1/gamecenter/2023020001/play-by-play/
          PlayByPlay: `${GAME_URL}/play-by-play`,
        };
      };
    }
  }
}

export module Paths {
    export const API_HOST_URL: string = `https://statsapi.web.nhl.com`;
    export const API_PART: string = 'api/v1';
    export const API_ENDPOINT = `${API_HOST_URL}/${API_PART}`;
    export const TeamLogo = (id: string) => `https://www-league.nhlstatic.com/images/logos/teams-current-primary-light/${id}.svg`;
    
    export module Get {
        export const Schedule: string = `${API_ENDPOINT}/schedule?expand=schedule.linescore,schedule.game.seriesSummary`;
        export const ScheduleByDate:(startDate: string, endDate?: string) => string = 
            (start, end) => `${Schedule}&startDate=${start}&endDate=${end || start}`;

        export const TeamSchedule: (id: string) => string =
            (id) => `${Schedule}&teamId=${id}`;

        export const TeamLastGame: (id: string) => string =
            (id) => `${Team(id)}?expand=team.schedule.previous&expand=schedule.linescore`;
    
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
        export const GameContent: (id: string) => string = (id) => `${API_ENDPOINT}/game/${id}/content`;
        export const GameFeedDiff: (id: string, timecode: string) => string =
            (id, timecode) => `${API_ENDPOINT}/game/${id}/feed/live/diffPatch?startTimecode=${timecode}`;
        export const PlayoffStandings: string = `${API_ENDPOINT}/tournaments/playoffs?expand=round.series,schedule.game.seriesSummary`;
    }

}