import { LocalizedString } from "./Common";

interface TvBroadcast {
	id: number;
	market: string;
	countryCode: string;
	network: string;
}
interface AwayTeam {
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
interface HomeTeam {
	id: number;
	placeName: LocalizedString;
	abbrev: string;
	logo: string;
	darkLogo: string;
	homeSplitSquad: boolean;
	score?: number;
	airlineLink?: string;
	airlineDesc?: string;
	hotelLink?: string;
	hotelDesc?: string;
	radioLink?: string;
}
interface PeriodDescriptor {
	periodType?: string;
	number?: number;
}
interface GameOutcome {
	lastPeriodType: string;
}

interface WinningGoalie {
	playerId: number;
	firstInitial: LocalizedString;
	lastName: LocalizedString;
}

interface Game {
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
	gameCenterLink: string;
	threeMinRecap?: string;
	threeMinRecapFr?: string;
	ticketsLink?: string;
	specialEvent?: LocalizedString;
}
export interface TeamSeasonScheduleResponse {
	previousSeason: number;
	currentSeason: number;
	clubTimezone: string;
	clubUTCOffset: string;
	games: Game[];
}
