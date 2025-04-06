import { LocalizedString } from "./Common";

export interface TvBroadcast {
    id: number;
    market: string;
    countryCode: string;
    network: string;
}

export interface AwayTeam {
    id: string;
    placeName: LocalizedString;
    abbrev: string;
    logo: string;
    darkLogo: string;
    awaySplitSquad: boolean;
    radioLink: string;
    odds?: Odd[];
    score?: number;
}

export interface HomeTeam {
    id: string;
    placeName: LocalizedString;
    abbrev: string;
    logo: string;
    darkLogo: string;
    homeSplitSquad: boolean;
    radioLink: string;
    odds?: Odd[];
}
export interface PeriodDescriptor {
    number?: number;
    periodType?: string;
}

export interface Odd {
    providerId: number;
    value: string;
}

export interface Game {
    id: string;
    season: number;
    gameType: number;
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
    gameCenterLink: string;
    ticketsLink?: string;
    gameOutcome?: GameOutcome;
    winningGoalie?: WinningPlayer;
    winningGoalScorer?: WinningPlayer;
    threeMinRecap?: string;
    threeMinRecapFr?: string;
}

export interface GameOutcome {
    lastPeriodType: string;
}
export interface WinningPlayer {
    playerId: number;
    firstInitial: LocalizedString;
    lastName: LocalizedString;
}

export interface GameWeek {
    date: string;
    dayAbbrev: string;
    numberOfGames: number;
    games: Game[];
}
export interface OddsPartner {
    partnerId: number;
    country: string;
    name: string;
    imageUrl: string;
    siteUrl?: string;
    bgColor: string;
    textColor: string;
    accentColor: string;
}
export interface DayScheduleResponse {
    nextStartDate: string;
    previousStartDate: string;
    gameWeek: GameWeek[];
    oddsPartners: OddsPartner[];
    preSeasonStartDate: string;
    regularSeasonStartDate: string;
    regularSeasonEndDate: string;
    playoffEndDate: string;
    numberOfGames: number;
}
