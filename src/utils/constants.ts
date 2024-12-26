import dotenv from "dotenv";
import { StandingsTypes } from "../models/StandingsTypes";
import { GoalShotType, PenaltyType } from "./enums";
dotenv.config();

export module Config {
    export const TIME_ZONE = "America/Los_Angeles";
    export const BODY_DATE_FORMAT = `iii PP @ p`; // "Thu Dec 28, 2023 @ 4:16 PM"
    export const TITLE_DATE_FORMAT = `iii PP`;
}

export module RoleIds {
    export const MOD = "370946173902520342";
}

export module ChannelIds {
    export const DEBUG = "541322708844281867";
    export const KRAKEN = "389864168926216193";
    export const KRAKEN_TEST = "994014273888063547";
}

export module GuildIds {
    export const SEATTLE = "370945003566006272";
    export const TEST = "994014272013205554";
}

export module Strings {
    export const KRAKEN_GAMEDAY_THREAD_TITLE = "Kraken Game Day Thread";
    export const REDLIGHT_EMBED = "<a:redlight:892194335951581247>";
    export const ZERO_WIDTH_SPACE = "​";
    export const PENALTY_STRINGS = {
        [PenaltyType.PS_COVERING_PUCK_IN_CREASE]: "Penalty Shot - Covering puck in crease",
        [PenaltyType.PS_GOALKEEPER_DISPLACED_NET]: "Penalty Shot - Goalkeeper displaced net",
        [PenaltyType.PS_HOLDING_ON_BREAKAWAY]: "Penalty Shot - Holding on breakaway",
        [PenaltyType.PS_HOOKING_ON_BREAKAWAY]: "Penalty Shot - Hooking on breakaway",
        [PenaltyType.PS_NET_DISPLACED]: "Penalty Shot - Net displaced",
        [PenaltyType.PS_SLASH_ON_BREAKAWAY]: "Penalty Shot - Slashing on breakaway",
        [PenaltyType.PS_THROWING_OBJECT_AT_PUCK]: "Penalty Shot - Throwing object at puck",
        [PenaltyType.PS_TRIPPING_ON_BREAKAWAY]: "Penalty Shot - Tripping on breakaway",
        [PenaltyType.ABUSE_OF_OFFICIALS]: "Abuse of officials",
        [PenaltyType.BENCH]: "Bench penalty",
        [PenaltyType.BOARDING]: "Boarding",
        [PenaltyType.BROKEN_STICK]: "Playing with broken stick",
        [PenaltyType.CHARGING]: "Charging",
        [PenaltyType.CLIPPING]: "Clipping",
        [PenaltyType.CLOSING_HAND_ON_PUCK]: "Closing hand on puck",
        [PenaltyType.CROSS_CHECKING]: "Cross-checking",
        [PenaltyType.DELAYING_GAME]: "Delay of game",
        [PenaltyType.DELAYING_GAME_BENCH]: "Delay of game: bench",
        [PenaltyType.DELAYING_GAME_BENCH_FACE_OFF_VIOLATION]: "Delay of game: bench face-off violation",
        [PenaltyType.DELAYING_GAME_EQUIPMENT]: "Delay of game: equipment",
        [PenaltyType.DELAYING_GAME_FACE_OFF_VIOLATION]: "Delay of game: face-off violation",
        [PenaltyType.DELAYING_GAME_PUCK_OVER_GLASS]: "Delay of game: puck over glass",
        [PenaltyType.DELAYING_GAME_SMOTHERING_PUCK]: "Delay of game: mothering puck",
        [PenaltyType.DELAYING_GAME_UNSUCCESSFUL_CHALLENGE]: "Unsuccessful challenge",
        [PenaltyType.ELBOWING]: "Elbowing",
        [PenaltyType.EMBELLISHMENT]: "Embellishment",
        [PenaltyType.GOALIE_LEAVE_CREASE]: "Goalie left crease",
        [PenaltyType.GOALIE_PARTICIPATION_BEYOND_CENTER]: "Goalie beyond center",
        [PenaltyType.HIGH_STICKING]: "High-sticking",
        [PenaltyType.HOLDING]: "Holding",
        [PenaltyType.HOLDING_THE_STICK]: "Holding the stick",
        [PenaltyType.HOOKING]: "Hooking",
        [PenaltyType.ILLEGAL_CHECK_TO_HEAD]: "Illegal check to head",
        [PenaltyType.ILLEGAL_STICK]: "Illegal stick",
        [PenaltyType.INSTIGATOR]: "Instigator",
        [PenaltyType.INTERFERENCE]: "Interference",
        [PenaltyType.INTERFERENCE_BENCH]: "Bench interference",
        [PenaltyType.INTERFERENCE_GOALKEEPER]: "Goalkeeper interference",
        [PenaltyType.KNEEING]: "Kneeing",
        [PenaltyType.PLAYING_WITHOUT_A_HELMET]: "Playing without helmet",
        [PenaltyType.PUCK_THROWN_FORWARD_GOALKEEPER]: "Goalie threw puck forward",
        [PenaltyType.ROUGHING]: "Roughing",
        [PenaltyType.ROUGHING_REMOVING_OPPONENTS_HELMET]: "Roughing: removing opponent's helmet",
        [PenaltyType.SLASHING]: "Slashing",
        [PenaltyType.THROWING_EQUIPMENT]: "Throwing equipment",
        [PenaltyType.TOO_MANY_MEN_ON_THE_ICE]: "Too many men on ice",
        [PenaltyType.TRIPPING]: "Tripping",
        [PenaltyType.UNSPORTSMANLIKE_CONDUCT]: "Unsportsmanlike conduct",
        [PenaltyType.UNSPORTSMANLIKE_CONDUCT_BENCH]: "Bench unsportsmanlike conduct",
        [PenaltyType.HIGH_STICKING_DOUBLE_MINOR]: "High-sticking double minor",
        [PenaltyType.SPEARING_DOUBLE_MINOR]: "Spearing double minor",
        [PenaltyType.CHECKING_FROM_BEHIND]: "Checking from behind",
        [PenaltyType.FIGHTING]: "Fighting",
        [PenaltyType.SPEARING]: "Spearing",
        [PenaltyType.ABUSIVE_LANGUAGE]: "Abusive language",
        [PenaltyType.AGGRESSOR]: "Aggressor",
        [PenaltyType.GAME_MISCONDUCT]: "Game misconduct",
        [PenaltyType.INSTIGATOR_MISCONDUCT]: "Instigator - Misconduct",
        [PenaltyType.MISCONDUCT]: "Misconduct",
        [PenaltyType.MATCH_PENALTY]: "Match penalty",
    };
    export const GOAL_TYPE_STRINGS = {
        [GoalShotType.WRIST]: "Wrist shot",
        [GoalShotType.SLAP]: "Slap shot",
        [GoalShotType.SNAP]: "Snap shot",
        [GoalShotType.BACKHAND]: "Backhand",
        [GoalShotType.TIP_IN]: "Tip-in",
        [GoalShotType.DEFLECTED]: "Deflection",
        [GoalShotType.WRAP_AROUND]: "Wrap-around",
        [GoalShotType.POKE]: "Poke",
        [GoalShotType.BAT]: "Batted in",
        [GoalShotType.CRADLE]: "Cradled",
        [GoalShotType.BETWEEN_LEGS]: "Between-the-legs",
    };
}
export module Environment {
    export const botToken = process.env["bot_token"] || undefined;
    export const DEBUG = process.env["hockeybotDEBUG"] ? true : false;
    export const KRAKENCHANNEL = process.env["KRAKEN_CHANNEL_ID"] || undefined;
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
    HTTP_CLOUD_WIRED_WEB = "HTTP_CLOUD_WIRED_WEB",
}

export enum EventTypes {
    Goal = "GOAL",
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
    PREVIEW = "1",
}
export enum GameTypes {
    PRESEASON = "PR",
    REGULAR = "R",
    PLAYOFFS = "P",
    ALLSTAR = "A",
    WOMENSALLSTAR = "WA",
    OLYMPIC = "O",
}

export enum PlayerTypes {
    Scorer = "Scorer",
    Shooter = "Shooter",
    Goalie = "Goalie",
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
    statsSingleSeasonPlayoffs = "statsSingleSeasonPlayoffs",
}

export module Kraken {
    export const TeamId: string = "55";
}

export interface Record {
    Wins: number;
    Losses: number;
    Overtime: number;
}

export module Paths {
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
        const CALENDAR_URL: string = `${URL}-calendar`;

        export const AllGames: (date?: string) => string = (date?) => `${URL}/${date || "now"}`;
        // TODO - API
        export const ScheduleCalendar: (date?: string) => string = (date?) => `${CALENDAR_URL}/${date || "now"}`;
        export const TeamWeeklySchedule: (abbreviation: string) => string = (abbreviation) =>
            `${API_ENDPOINT}/club-schedule/${abbreviation}/week/now`;
        export const TeamMonthlySchedule: (abbreviation: string) => string = (abbreviation) =>
            `${API_ENDPOINT}/club-schedule/${abbreviation}/month/now`;
        export const TeamSeasonSchedule: (abbreviation: string) => string = (abbreviation) =>
            `${API_ENDPOINT}/club-schedule-season/${abbreviation}/now`;
    }

    export module Teams {
        export const ROSTER_URL = `${API_ENDPOINT}/roster`;
        export const SEASON_URL = `${API_ENDPOINT}/roster-season`;

        // https://api-web.nhle.com/v1/roster-season/sea -> [20212022, 20222023, 20232024]
        export const RosterSeasons = (team: string) => `${SEASON_URL}/${team}`;

        // https://api-web.nhle.com/v1/roster/sea/20232024
        export const Roster = (team: string, season: number) => `${URL}/${team}/${season}`;
    }
    // TODO - API
    export module Stats {
        const STATS_URL = `${API_ENDPOINT}/club-stats`;
        const SEASON_URL = `${API_ENDPOINT}/club-stats-season`;

        // https://api-web.nhle.com/v1/club-stats-season/sea
        export const StatSeasons = (team: string) => `${SEASON_URL}/${team}`;

        // https://api-web.nhle.com/v1/club-stats/sea/now
        export const TeamCurrentStats = (team: string) => `${STATS_URL}/${team}/now`;

        // https://api-web.nhle.com/v1/club-stats/sea/20232024/2
        export const TeamSeasonPlayerStats = (team: string, season: string, playoffs?: boolean) =>
            `${STATS_URL}/${team}/${season}/${playoffs ? 3 : 2}`;

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
        export const Scoreboard = (team?: string) => `${SCOREBOARD_URL}/${team ?? ""}/now`;
        // Today's games: https://api-web.nhle.com/v1/score/now
        // Dated games:   https://api-web.nhle.com/v1/score/2023-10-19
        export const ByDate: (date?: string) => string = (date) => `${SCORE_URL}/${date || "now"}`;
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
    export module Search {
        const URL = "https://search.d3.nhle.com/api/v1/search";
        // https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=20&q=gir%2A&active=true
        export const Player = (player: string) => `${URL}/player?culture=en-us&limit=25&q=${player}%2A&active=true`;
    }

    export module Rest {
        const URL = `https://api.nhle.com/stats/rest/en`;
        const teamEndpoint = `${URL}/team`;
        export const TeamInfoByTriCode = (team: string) => `${teamEndpoint}/?cayenneExp=triCode="${team}"`;
        export const AllTeamSummaries = (season: string) => `${teamEndpoint}/summary?cayenneExp=seasonId=${season}`;
    }

    export module Seasons {
        const URL = `${API_ENDPOINT}/season`;
        export const All = URL;
    }
}

// #region old paths
export module Legacy_Paths {
    export const API_HOST_URL: string = `https://statsapi.web.nhl.com`;
    export const API_PART: string = "api/v1";
    export const API_ENDPOINT = `${API_HOST_URL}/${API_PART}`;
    export const TeamLogo = (id: string) =>
        `https://www-league.nhlstatic.com/images/logos/teams-current-primary-light/${id}.svg`;

    export module Get {
        export const Schedule: string = `${API_ENDPOINT}/schedule?expand=schedule.linescore,schedule.game.seriesSummary`;
        export const ScheduleByDate: (startDate: string, endDate?: string) => string = (start, end) =>
            `${Schedule}&startDate=${start}&endDate=${end || start}`;

        export const TeamSchedule: (id: string) => string = (id) => `${Schedule}&teamId=${id}`;

        export const TeamLastGame: (id: string) => string = (id) =>
            `${Team(id)}?expand=team.schedule.previous&expand=schedule.linescore`;

        export const TeamScheduleByDate: (team: string, startDate: string, endDate?: string) => string = (
            id,
            start,
            end
        ) => `${Schedule}&teamId=${id}&startDate=${start}&endDate=${end || start}`;

        export const Teams: string = `${API_ENDPOINT}/teams`;
        export const Team: (id: string) => string = (id) => `${Legacy_Paths.Get.Teams}/${id}`;

        export const Divisions: string = `${API_ENDPOINT}/divisions`;
        export const Division: (id: string) => string = (id) => `${Legacy_Paths.Get.Divisions}/${id}`;

        export const Conferences: string = `${API_ENDPOINT}/conferences`;
        export const Conference: (id: string) => string = (id) => `${Legacy_Paths.Get.Conferences}/${id}`;

        export const People: string = `${API_ENDPOINT}/people`;
        export const Person: (id: string) => string = (id) => `${Legacy_Paths.Get.People}/${id}`;
        export const PersonSeasonStats: (id: string) => string = (id) =>
            `${Person(id)}/stats?stats=${StatsTypes.statsSingleSeason}`;

        export const Seasons: string = `${API_ENDPOINT}/seasons`;

        export const TeamStats: (id: string) => string = (id) => `${Team(id)}/stats`;

        export const Roster: (id: string) => string = (id) => `${Team(id)}/roster`;
        export const Standings: string = `${API_ENDPOINT}/standings`;
        export const CustomStandings: (type: StandingsTypes) => string = (type) => `${Standings}/${type}`;

        export const GameFeed: (id: string) => string = (id) => `${API_ENDPOINT}/game/${id}/feed/live`;
        export const GameContent: (id: string) => string = (id) => `${API_ENDPOINT}/game/${id}/content`;
        export const GameFeedDiff: (id: string, timecode: string) => string = (id, timecode) =>
            `${API_ENDPOINT}/game/${id}/feed/live/diffPatch?startTimecode=${timecode}`;
        export const PlayoffStandings: string = `${API_ENDPOINT}/tournaments/playoffs?expand=round.series,schedule.game.seriesSummary`;
    }
}
// #endregion
