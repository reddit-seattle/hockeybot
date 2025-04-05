import { LocalizedString } from "./Common";

export interface TvBroadcast {
    id: number;
    market: string;
    countryCode: string;
    network: string;
}
export interface AwayTeam {
    id: number;
    placeName: LocalizedString;
    abbrev: string;
    logo: string;
    darkLogo: string;
    awaySplitSquad: boolean;
    airlineLink?: string;
    airlineDesc?: string;
    score?: number;
    hotelLink?: string;
    hotelDesc?: string;
    radioLink?: string;
}
export interface HomeTeam {
    id: number;
    placeName: LocalizedString;
    abbrev: string;
    logo: string;
    darkLogo: string;
    homeSplitSquad: boolean;
    hotelLink?: string;
    hotelDesc?: string;
    score?: number;
    airlineLink?: string;
    airlineDesc?: string;
    radioLink?: string;
}
export interface PeriodDescriptor {
    number?: number;
    periodType?: string;
}
export interface GameOutcome {
    lastPeriodType: string;
}

export interface WinningGoalie {
    playerId: number;
    firstInitial: LocalizedString;
    lastName: LocalizedString;
}
export interface Game {
    id: number;
    season: number;
    gameType: number;
    gameDate: string;
    venue: LocalizedString;
    neutralSite: boolean;
    startTimeUTC: string;
    easternUTCOffset: string;
    venueUTCOffset: string;
    venueTimezone: string;
    gameState: string;
    gameScheduleState: string;
    tvBroadcasts: TvBroadcast[];
    awayTeam: AwayTeam;
    homeTeam: HomeTeam;
    periodDescriptor: PeriodDescriptor;
    gameOutcome?: GameOutcome;
    winningGoalie?: WinningGoalie;
    winningGoalScorer?: WinningGoalie;
    threeMinRecap?: string;
    threeMinRecapFr?: string;
    gameCenterLink: string;
    ticketsLink?: string;
}
export interface TeamMonthlyScheduleResponse {
    previousMonth: string;
    currentMonth: string;
    nextMonth: string;
    calendarUrl: string;
    clubTimezone: string;
    clubUTCOffset: string;
    games: Game[];
}
