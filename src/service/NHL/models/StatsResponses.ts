import { LocalizedString } from "./Common";

export interface StatsSeason {
	season: string;
	gameTypes: number[];
}

export interface Skater {
	playerId: number;
	headshot: string;
	firstName: LocalizedString;
	lastName: LocalizedString;
	positionCode: string;
	gamesPlayed: number;
	goals: number;
	assists: number;
	points: number;
	plusMinus: number;
	penaltyMinutes: number;
	powerPlayGoals: number;
	shorthandedGoals: number;
	gameWinningGoals: number;
	overtimeGoals: number;
	shots: number;
	shootingPctg: number;
	avgTimeOnIcePerGame: number;
	avgShiftsPerGame: number;
	faceoffWinPctg: number;
}
export interface Goalie {
	playerId: number;
	headshot: string;
	firstName: LocalizedString;
	lastName: LocalizedString;
	gamesPlayed: number;
	gamesStarted: number;
	wins: number;
	losses: number;
	ties: number;
	overtimeLosses: number;
	goalsAgainstAverage: number;
	savePercentage: number;
	shotsAgainst: number;
	saves: number;
	goalsAgainst: number;
	shutouts: number;
	goals: number;
	assists: number;
	points: number;
	penaltyMinutes: number;
	timeOnIce: number;
}
export interface TeamSeasonStatsResponse {
	season: string;
	gameType: number;
	skaters: Skater[];
	goalies: Goalie[];
}
