import { LocalizedString } from "./Common";

export interface PlayoffSeriesResponse {
    round: number;
    roundAbbrev: string;
    roundLabel: string;
    seriesLetter: string;
    seriesLogo: string;
    seriesLogoFr: string;
    neededToWin: number;
    length: number;
    bottomSeedTeam: BottomSeedTeam;
    topSeedTeam: TopSeedTeam;
    games: Game[];
    fullCoverageUrl: FullCoverageUrl;
}

export interface BottomSeedTeam {
    id: number;
    name: LocalizedString;
    abbrev: string;
    placeName: LocalizedString;
    placeNameWithPreposition: LocalizedString;
    conference: Conference;
    record: string;
    seriesWins: number;
    divisionAbbrev: string;
    seed: number;
    logo: string;
    darkLogo: string;
}

export interface Conference {
    name: string;
    abbrev: string;
}

export interface TopSeedTeam {
    id: number;
    name: LocalizedString;
    abbrev: string;
    placeName: LocalizedString;
    placeNameWithPreposition: LocalizedString;
    conference: Conference;
    record: string;
    seriesWins: number;
    divisionAbbrev: string;
    seed: number;
    logo: string;
    darkLogo: string;
}

export interface Game {
    id: number;
    season: number;
    gameType: number;
    gameNumber: number;
    ifNecessary: boolean;
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
    gameCenterLink: string;
    periodDescriptor: PeriodDescriptor;
    seriesStatus: SeriesStatus;
    gameOutcome: GameOutcome;
}

export interface TvBroadcast {
    id: number;
    market: string;
    countryCode: string;
    network: string;
    sequenceNumber: number;
}

export interface AwayTeam {
    id: number;
    placeName: LocalizedString;
    placeNameWithPreposition: LocalizedString;
    abbrev: string;
    score: number;
}

export interface HomeTeam {
    id: number;
    placeName: LocalizedString;
    placeNameWithPreposition: LocalizedString;
    abbrev: string;
    score: number;
}

export interface PeriodDescriptor {
    number: number;
    periodType: string;
    maxRegulationPeriods: number;
}

export interface SeriesStatus {
    topSeedWins: number;
    bottomSeedWins: number;
}

export interface GameOutcome {
    lastPeriodType: string;
    otPeriods?: number;
}

export interface FullCoverageUrl {
    cs?: string;
    de?: string;
    sv?: string;
    fi?: string;
    sk?: string;
    en?: string;
    fr?: string;
    es?: string;
}
