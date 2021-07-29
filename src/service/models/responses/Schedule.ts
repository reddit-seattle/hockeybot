export module Schedule {
    export interface Status {
        abstractGameState: string;
        codedGameState: string;
        detailedState: string;
        statusCode: string;
        startTimeTBD: boolean;
    }

    export interface Linescore {
        currentPeriod: number;
        currentPeriodOrdinal: string;
        currentPeriodTimeRemaining: string;
        periods: Period[];
        shootoutInfo: ShootoutInfo;
        teams: Teams;
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