import { LocalizedString } from "./Common";

export interface StoryResponse {
	id: number;
	season: number;
	gameType: number;
	limitedScoring: boolean;
	gameDate: string;
	venue: LocalizedString;
	venueLocation: LocalizedString;
	startTimeUTC: string;
	easternUTCOffset: string;
	venueUTCOffset: string;
	venueTimezone: string;
	tvBroadcasts: TvBroadcast[];
	gameState: string;
	gameScheduleState: string;
	awayTeam: AwayTeam;
	homeTeam: HomeTeam;
	shootoutInUse: boolean;
	maxPeriods: number;
	regPeriods: number;
	otInUse: boolean;
	tiesInUse: boolean;
	summary: Summary;
	periodDescriptor: PeriodDescriptor2;
	clock: Clock;
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
	name: LocalizedString;
	abbrev: string;
	placeName: LocalizedString;
	score: number;
	sog: number;
	logo: string;
}

export interface HomeTeam {
	id: number;
	name: LocalizedString;
	abbrev: string;
	placeName: LocalizedString;
	score: number;
	sog: number;
	logo: string;
}

export interface Summary {
	scoring: Scoring[];
	shootout: any[];
	threeStars: ThreeStar[];
	teamGameStats: TeamGameStat[];
}

export interface Scoring {
	periodDescriptor: PeriodDescriptor;
	goals: Goal[];
}

export interface PeriodDescriptor {
	number: number;
	periodType: string;
	maxRegulationPeriods: number;
}

export interface Goal {
	situationCode: string;
	strength: string;
	playerId: number;
	firstName: LocalizedString;
	lastName: LocalizedString;
	name: LocalizedString;
	teamAbbrev: LocalizedString;
	headshot: string;
	highlightClipSharingUrl: string;
	highlightClipSharingUrlFr: string;
	highlightClip: number;
	highlightClipFr: number;
	discreteClip: number;
	discreteClipFr: number;
	goalsToDate: number;
	awayScore: number;
	homeScore: number;
	leadingTeamAbbrev?: LocalizedString;
	timeInPeriod: string;
	shotType: string;
	goalModifier: string;
	assists: Assist[];
	homeTeamDefendingSide: string;
}

export interface Assist {
	playerId: number;
	firstName: LocalizedString;
	lastName: LocalizedString;
	name: LocalizedString;
	assistsToDate: number;
	sweaterNumber: number;
}

export interface ThreeStar {
	star: number;
	playerId: number;
	teamAbbrev: string;
	headshot: string;
	name: string;
	sweaterNo: number;
	position: string;
	goals: number;
	assists: number;
	points: number;
}

export interface TeamGameStat {
	category: string;
	awayValue: any;
	homeValue: any;
}

export interface PeriodDescriptor2 {
	number: number;
	periodType: string;
	maxRegulationPeriods: number;
}

export interface Clock {
	timeRemaining: string;
	secondsRemaining: number;
	running: boolean;
	inIntermission: boolean;
}
