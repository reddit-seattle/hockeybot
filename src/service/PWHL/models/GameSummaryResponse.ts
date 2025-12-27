export interface PWHLGameSummaryResponse {
	GC: {
		Gamesummary: GameSummary;
	};
}

export interface GameSummary {
	meta: GameMeta;
	visitor: TeamInfo;
	home: TeamInfo;
	venue: string;
	periods: any;
	goalsByPeriod: any;
	shotsByPeriod: any;
	details?: GameDetails;
	gameInfo?: GameInfo;
	// Dynamic properties added during live game tracking
	totalShots?: {
		home: number;
		visitor: number;
	};
	powerPlayCount?: {
		home: number;
		visitor: number;
	};
}

export interface GameMeta {
	id: string;
	season_id: string;
	number: string;
	date: string;
	home_id: string;
	home_code: string;
	visiting_id: string;
	visiting_code: string;
	time_zone: string;
	status: string;
	game_status_string: string;
	period: string;
	clock: string;
	quick_score: string;
}

export interface GameInfo {
	homeTeam: TeamInfo;
	visitingTeam: TeamInfo;
	venue: string;
	venueLocation: string;
	attendance: string;
}

export interface TeamInfo {
	id: string;
	name: string;
	city: string;
	nickname: string;
	code: string;
	logo: string;
}

export interface Period {
	info: PeriodInfo;
	stats: TeamPeriodStats;
}

export interface PeriodInfo {
	id: string;
	long_name: string;
	short_name: string;
}

export interface TeamPeriodStats {
	homeGoals: string;
	visitingGoals: string;
	homeShots: string;
	visitingShots: string;
}

export interface GameDetails {
	homeTeamScoring: ScoringPlay[];
	visitingTeamScoring: ScoringPlay[];
	homeTeamPenalties: Penalty[];
	visitingTeamPenalties: Penalty[];
	homeGoalies: GoalieStats[];
	visitingGoalies: GoalieStats[];
	shots: {
		homeTeam: string;
		visitingTeam: string;
	};
	powerPlay: {
		homeTeam: string;
		visitingTeam: string;
	};
}

export interface ScoringPlay {
	period: string;
	time: string;
	scorer: string;
	scorerId: string;
	assists: string;
	assistIds: string;
	homeScore: string;
	visitingScore: string;
	strength: string;
}

export interface Penalty {
	period: string;
	time: string;
	player: string;
	playerId: string;
	infraction: string;
	minutes: string;
}

export interface GoalieStats {
	name: string;
	playerId: string;
	shots: string;
	saves: string;
	goals: string;
	decision: string;
}
