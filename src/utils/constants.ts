import dotenv from "dotenv";
import { GoalShotType, PenaltyType } from "./enums";
dotenv.config();

export namespace Config {
    export const TIME_ZONE = "America/Los_Angeles";
    export const BODY_DATE_FORMAT = `iii PP @ p`; // "Thu Dec 28, 2023 @ 4:16 PM"
    export const TITLE_DATE_FORMAT = `iii PP`;
}

export namespace Colors {
    export const EMBED_COLOR = 39129;
}

export namespace RoleIds {
    export const MOD = "370946173902520342";
}

export namespace ChannelIds {
    export const DEBUG = "541322708844281867";
    export const KRAKEN = "389864168926216193";
    export const KRAKEN_TEST = "994014273888063547";
}

export namespace GuildIds {
    export const SEATTLE = "370945003566006272";
    export const TEST = "994014272013205554";
}

export namespace Strings {
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
export namespace Environment {
    export const botToken = process.env["dev_token"] || undefined;
    export const DEBUG = process.env["hockeybotDEBUG"] ? true : false;
    export const KRAKENCHANNEL = process.env["KRAKEN_CHANNEL_ID"] || undefined;
    export const LOCAL_RUN = process.env["local_run"] ? true : false;
    export const KRAKEN_TEAM_ID = process.env["KRAKEN_TEAM_ID"] ?? "55";
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

export namespace Kraken {
    // kraken is 55 plz don't forget
    // TODO - shift to KRAKEN_TEAM_ID / env var
    export const TeamId: string = "29";
}

export interface Record {
    Wins: number;
    Losses: number;
    Overtime: number;
}

export namespace Paths {
    /***
     * All games today:               https://api-web.nhle.com/v1/schedule/now
     * Calendar Schedule?:            https://api-web.nhle.com/v1/schedule-calendar/2023-12-21
     * This week's kraken games:      https://api-web.nhle.com/v1/club-schedule/SEA/week/now
     * This month's kraken games:     https://api-web.nhle.com/v1/club-schedule/SEA/month/now
     * This season's kraken games:    https://api-web.nhle.com/v1/club-schedule-season/SEA/now
     */
    export const API_ENDPOINT = "https://api-web.nhle.com/v1";
    export namespace Schedule {
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

    export namespace Teams {
        export const ROSTER_URL = `${API_ENDPOINT}/roster`;
        export const SEASON_URL = `${API_ENDPOINT}/roster-season`;

        // https://api-web.nhle.com/v1/roster-season/sea -> [20212022, 20222023, 20232024]
        export const RosterSeasons = (team: string) => `${SEASON_URL}/${team}`;

        // https://api-web.nhle.com/v1/roster/sea/20232024
        export const Roster = (team: string, season: number) => `${URL}/${team}/${season}`;
    }
    // TODO - API
    export namespace Stats {
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
    export namespace Standings {
        // `https://api-web.nhle.com/v1/standings-season`; // can be used for  different year's standings values, whether they allow ties / wildcards etc
        // `https://api-web.nhle.com/v1/standings/now`;
        const URL = `${API_ENDPOINT}/standings`;
        export const CurrentStandings = `${URL}/now`;
    }
    export namespace Games {
        const SCORE_URL = `${API_ENDPOINT}/score`;
        const SCOREBOARD_URL = `${API_ENDPOINT}/scoreboard`;

        // https://api-web.nhle.com/v1/scoreboard/sea/now
        export const Scoreboard = (team?: string) => `${SCOREBOARD_URL}/${team ?? ""}/now`;
        // https://api-web.nhle.com/v1/wsc/game-story/2024020543
        export const Story = (id: string) => `${API_ENDPOINT}/wsc/game-story/${id}`;
        // Today's games: https://api-web.nhle.com/v1/score/now
        // Dated games:   https://api-web.nhle.com/v1/score/2023-10-19
        export const ByDate: (date?: string) => string = (date) => `${SCORE_URL}/${date || "now"}`;
        export namespace Live {
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
    export namespace Search {
        const URL = "https://search.d3.nhle.com/api/v1/search";
        // https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=20&q=gir%2A&active=true
        export const Player = (player: string) => `${URL}/player?culture=en-us&limit=25&q=${player}%2A&active=true`;
    }

    export namespace Rest {
        const URL = `https://api.nhle.com/stats/rest/en`;
        const teamEndpoint = `${URL}/team`;
        export const TeamInfoByTriCode = (team: string) => `${teamEndpoint}/?cayenneExp=triCode="${team}"`;
        export const AllTeamSummaries = (season: string) => `${teamEndpoint}/summary?cayenneExp=seasonId=${season}`;
    }

    export namespace Seasons {
        const URL = `${API_ENDPOINT}/season`;
        export const All = URL;
    }

    export namespace Playoffs {
        // https://api-web.nhle.com/v1/playoff-series/carousel/20232024/
        export const Carousel = (season: string) => `${API_ENDPOINT}/playoff-series/carousel/${season}`;
        // https://api-web.nhle.com/v1/schedule/playoff-series/20232024/a
        export const Series = (season: string, matchup: string) =>
            `${API_ENDPOINT}/schedule/playoff-series/${season}/${matchup}`;
        // https://api-web.nhle.com/v1/playoff-bracket/2022
        export const Bracket = (year: string) => `${API_ENDPOINT}/playoff-bracket/${year}`;
    }
}
