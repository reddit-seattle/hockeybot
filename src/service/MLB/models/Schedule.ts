export interface ScheduleResponse {
    copyright: string;
    totalItems: number;
    totalEvents: number;
    totalGames: number;
    totalGamesInProgress: number;
    dates: ScheduleDate[];
}

export interface ScheduleDate {
    date: string;
    totalItems: number;
    totalEvents: number;
    totalGames: number;
    totalGamesInProgress: number;
    games: Game[];
    events: any[];
}

export interface Game {
    gamePk: string;
    gameGuid: string;
    link: string;
    gameType: string;
    season: string;
    gameDate: string;
    officialDate: string;
    status: Status;
    teams: Teams;
    venue: Venue;
    content: Content;
    gameNumber: number;
    publicFacing: boolean;
    doubleHeader: string;
    gamedayType: string;
    tiebreaker: string;
    calendarEventID: string;
    seasonDisplay: string;
    dayNight: string;
    scheduledInnings: number;
    reverseHomeAwayStatus: boolean;
    inningBreakLength: number;
    gamesInSeries: number;
    seriesGameNumber: number;
    seriesDescription: string;
    recordSource: string;
    ifNecessary: string;
    ifNecessaryDescription: string;
}

export interface Status {
    abstractGameState: string;
    codedGameState: string;
    detailedState: string;
    statusCode: string;
    startTimeTBD: boolean;
    abstractGameCode: string;
}

export interface Teams {
    away: ScheduleTeamObj;
    home: ScheduleTeamObj;
}

export interface LeagueRecord {
    wins: number;
    losses: number;
    pct: string;
}

export interface Team {
    id: string;
    name: string;
    link: string;
}

export interface ScheduleTeamObj {
    leagueRecord: LeagueRecord;
    score?: number;
    team: Team;
    splitSquad: boolean;
    seriesNumber: number;
}

export interface Venue {
    id: number;
    name: string;
    link: string;
}

export interface Content {
    link: string;
}
