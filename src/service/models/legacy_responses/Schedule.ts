export module ScheduleResponse {
    export interface Status {
        abstractGameState: string;
        codedGameState: string;
        detailedState: string;
        statusCode: string;
        startTimeTBD: boolean;
    }

    export interface Teams {
        away: Away;
        home: Home;
    }

    export interface LineScoreTeam {
        team: CurrentTeam;
        goals: number;
        shotsOnGoal: number;
        numSkaters: number,
        goaliePulled: boolean;
        powerPlay: boolean;
    }
    export interface LineScoreTeams {
        away: LineScoreTeam;
        home: LineScoreTeam;
    }
    export interface CurrentTeam {
        id: string;
        name: string;
        link: string;
        triCode: string;
    }
    export interface Linescore {
        currentPeriod: number;
        currentPeriodOrdinal: string;
        currentPeriodTimeRemaining: string;
        periods: Period[];
        shootoutInfo: ShootoutInfo;
        teams: LineScoreTeams;
        powerPlayStrength: string;
        hasShootout: boolean;
        intermissionInfo: IntermissionInfo;
        powerPlayInfo: PowerPlayInfo;
    }

    export interface IntermissionInfo {
        intermissionTimeRemaining: number;
        intermissionTimeElapsed: number;
        inIntermission: boolean;
    }
    export interface PowerPlayInfo {
        situationTimeRemaining: number;
        situationTimeElapsed: number;
        inSituation: boolean;
    }

    export interface Period {
        periodType: string;
        startTime: Date;
        endTime: Date;
        num: number;
        ordinalNum: string;
        home: Home;
        away: Away;
    }

    export interface ShootoutInfo {
        away: Away;
        home: Home;
        startTime: Date;
    }


    export interface LeagueRecord {
        wins: number;
        losses: number;
        ot: number;
        type: string;
    }

    export interface Team {
        id: string;
        name: string;
        link: string;
    }

    export interface Away {
        leagueRecord: LeagueRecord;
        score: number;
        team: Team;
    }

    export interface Home {
        leagueRecord: LeagueRecord;
        score: number;
        team: Team;
    }

    export interface Teams {
        away: Away;
        home: Home;
    }

    export interface Venue {
        id: string;
        name: string;
        link: string;
    }

    export interface Content {
        link: string;
    }

    export interface SeriesSummary {
        gamePk: string; 
        gameNumber: number; // 6
        gameLabel: string; // Game 6
        necessary: boolean; // game is necessary
        gameCode: number; // 132? idk
        gameTime: string;
        seriesStatus: string; // Hurricanes lead 3-2
        seriesStatusShort: string; // shorter version of above?
    }

    export interface Game {
        gamePk: string;
        link: string;
        gameType: string;
        season: string;
        gameDate: string;
        status: Status;
        teams: Teams;
        linescore: Linescore;
        venue: Venue;
        content: Content;
        seriesSummary?: SeriesSummary 
    }

    export interface Date {
        date: string;
        totalItems: number;
        totalEvents: number;
        totalGames: number;
        totalMatches: number;
        games: Game[];
        events: any[];
        matches: any[];
    }

    export interface Response {
        copyright: string;
        totalItems: number;
        totalEvents: number;
        totalGames: number;
        totalMatches: number;
        wait: number;
        dates: Date[];
    }
}