import { LocalizedString } from "./Common";

export interface TvBroadcast {
    id: number;
    market: string;
    countryCode: string;
    network: string;
}
export interface PeriodDescriptor {
    number: number;
    periodType: string;
}
export interface Team {
    id: number;
    commonName: LocalizedString;
    abbrev: string;
    score: number;
    sog: number;
    faceoffWinningPctg: number;
    powerPlayConversion: string;
    pim: number;
    hits: number;
    blocks: number;
    logo: string;
}
export interface Clock {
    timeRemaining: string;
    secondsRemaining: number;
    running: boolean;
    inIntermission: boolean;
}
export interface ByPeriod {
    period: number;
    periodDescriptor: PeriodDescriptor;
    away: number;
    home: number;
}
export interface Totals {
    away: number;
    home: number;
}
export interface Linescore {
    byPeriod: ByPeriod[];
    totals: Totals;
}
export interface GameReports {
    gameSummary: string;
    eventSummary: string;
    playByPlay: string;
    faceoffSummary: string;
    faceoffComparison: string;
    rosters: string;
    shotSummary: string;
    shiftChart: string;
    toiAway: string;
    toiHome: string;
}
export interface Forward {
    playerId: number;
    sweaterNumber: number;
    name: LocalizedString;
    position: string;
    goals: number;
    assists: number;
    points: number;
    plusMinus: number;
    pim: number;
    hits: number;
    blockedShots: number;
    powerPlayGoals: number;
    powerPlayPoints: number;
    shorthandedGoals: number;
    shPoints: number;
    shots: number;
    faceoffs: string;
    faceoffWinningPctg: number;
    toi: string;
    powerPlayToi: string;
    shorthandedToi: string;
}

export interface Defense {
    playerId: number;
    sweaterNumber: number;
    name: LocalizedString;
    position: string;
    goals: number;
    assists: number;
    points: number;
    plusMinus: number;
    pim: number;
    hits: number;
    blockedShots: number;
    powerPlayGoals: number;
    powerPlayPoints: number;
    shorthandedGoals: number;
    shPoints: number;
    shots: number;
    faceoffs: string;
    faceoffWinningPctg: number;
    toi: string;
    powerPlayToi: string;
    shorthandedToi: string;
}
export interface Goalie {
    playerId: number;
    sweaterNumber: number;
    name: LocalizedString;
    position: string;
    evenStrengthShotsAgainst: string;
    powerPlayShotsAgainst: string;
    shorthandedShotsAgainst: string;
    saveShotsAgainst: string;
    evenStrengthGoalsAgainst: number;
    powerPlayGoalsAgainst: number;
    shorthandedGoalsAgainst: number;
    pim: number;
    goalsAgainst: number;
    toi: string;
    savePctg?: string;
}
export interface TeamPlayers {
    forwards: Forward[];
    defense: Defense[];
    goalies: Goalie[];
}

export interface PlayerByGameStats {
    awayTeam: TeamPlayers;
    homeTeam: TeamPlayers;
}
export interface Scratch {
    id: number;
    firstName: LocalizedString;
    lastName: LocalizedString;
}
export interface TeamInfo {
    headCoach: LocalizedString;
    scratches: Scratch[];
}
export interface GameInfo {
    referees: LocalizedString[];
    linesmen: LocalizedString[];
    awayTeam: TeamInfo;
    homeTeam: TeamInfo;
}
export interface Boxscore {
    linescore: Linescore;
    shotsByPeriod: ByPeriod[];
    gameReports: GameReports;
    playerByGameStats: PlayerByGameStats;
    gameInfo: GameInfo;
}
export interface GameOutcome {
    lastPeriodType: string;
}
export interface GameVideo {
    threeMinRecap: number;
    condensedGame: number;
    threeMinRecapFr?: number;
}
export interface GameBoxScoreResponse {
    id: number;
    season: number;
    gameType: number;
    gameDate: string;
    venue: LocalizedString;
    startTimeUTC: string;
    easternUTCOffset: string;
    venueUTCOffset: string;
    tvBroadcasts: TvBroadcast[];
    gameState: string;
    gameScheduleState: string;
    period: number;
    periodDescriptor: PeriodDescriptor;
    awayTeam: Team;
    homeTeam: Team;
    clock: Clock;
    boxscore: Boxscore;
    gameOutcome: GameOutcome;
    gameVideo: GameVideo;
}
