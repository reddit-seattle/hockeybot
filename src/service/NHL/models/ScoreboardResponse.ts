import { LocalizedString } from "./Common";

export interface TvBroadcast {
	id: number;
	market: string;
	countryCode: string;
	network: string;
}

export interface Team {
	id: number;
	name: LocalizedString;
	abbrev: string;
	score?: number;
	logo: string;
	sog?: number;
	record?: string;
}
export interface PeriodDescriptor {
	number: number;
	periodType: string;
}
export interface Clock {
	timeRemaining: string;
	secondsRemaining: number;
	running: boolean;
	inIntermission: boolean;
}
export interface Game {
	id: number;
	season: number;
	gameType: number;
	gameDate: string;
	gameCenterLink: string;
	venue: LocalizedString;
	startTimeUTC: string;
	easternUTCOffset: string;
	venueUTCOffset: string;
	tvBroadcasts: TvBroadcast[];
	gameState: string;
	gameScheduleState: string;
	awayTeam: Team;
	homeTeam: Team;
	ticketsLink: string;
	period?: number;
	periodDescriptor?: PeriodDescriptor;
	threeMinRecap?: string;
	threeMinRecapFr?: string;
	clock?: Clock;
}
export interface GamesByDate {
	date: string;
	games: Game[];
}
export interface ScoreboardResponse {
	focusedDate: string;
	focusedDateCount: number;
	clubTimeZone?: string;
	clubUTCOffset?: string;
	clubScheduleLink?: string;
	gamesByDate: GamesByDate[];
}
