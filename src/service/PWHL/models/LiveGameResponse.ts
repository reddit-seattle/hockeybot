// ============================================================================
// Common Types
// ============================================================================

export interface PlayerInfo {
	FirstName: string;
	LastName: string;
	Id: number;
	Jersey: number;
}

// ============================================================================
// Clock Models
// ============================================================================

export interface RunningClockData {
	Clock: {
		Minutes: string;
		Seconds: string;
		Running: boolean;
		period: string | number;
	};
	DatePlayed: string;
	status_id: number;
}

export interface RunningClock {
	games: {
		[gameId: string]: RunningClockData;
	};
}

export interface PublishedClockData {
	ClockMinutes: number;
	ClockSeconds: number;
	DatePlayed: string;
	Final: boolean;
	PeriodId: number;
	PeriodLongName: string;
	PeriodShortName: string;
	ProgressString: string;
	Started: boolean;
	StatusId: number;
	StatusName: string;
}

export interface PublishedClock {
	games: {
		[gameId: string]: PublishedClockData;
	};
}

// ============================================================================
// Goals Models
// ============================================================================

export interface GoalEvent {
	Assist1PlayerFirstName?: string;
	Assist1PlayerId?: number;
	Assist1PlayerJerseyNumber?: number;
	Assist1PlayerLastName?: string;
	Assist1PlayerNumAssists?: number;
	Assist2PlayerFirstName?: string;
	Assist2PlayerId?: number;
	Assist2PlayerJerseyNumber?: number;
	Assist2PlayerLastName?: string;
	Assist2PlayerNumAssists?: number;
	EmptyNet: number; // bool
	IsHome: boolean;
	LSEventId: number;
	MinusPlayers: PlayerInfo[];
	PenaltyShot: number; // bool
	Period: number;
	PeriodLongName: string;
	PeriodShortName: string;
	PlusPlayers: PlayerInfo[];
	PowerPlay: number; // bool
	ScorerGoalNumber: number;
	ScorerJerseyNumber: number;
	ScorerPlayerFirstName: string;
	ScorerPlayerId: number;
	ScorerPlayerImageURL: string;
	ScorerPlayerLastName: string;
	ShortHanded: number; // bool
	Time: string; // "03:26"
}

export interface GameGoalsData {
	DatePlayed: string;
	GameGoals: {
		[eventId: string]: GoalEvent;
	};
}

export interface Goals {
	games: {
		[gameId: string]: GameGoalsData;
	};
}

// ============================================================================
// Penalties Models
// ============================================================================

export interface PenaltyEvent {
	Bench: number; // bool
	CoachId: number;
	Home: number; // bool
	LSEventId: number;
	Minutes: number;
	Offence: number; // Offence code
	OffenceDescription: string;
	OfficialId: number;
	PenalizedPlayerFirstName: string;
	PenalizedPlayerId: number;
	PenalizedPlayerImageURL: string;
	PenalizedPlayerJerseyNumber: number;
	PenalizedPlayerLastName: string;
	PenaltyShot: number; // bool
	Period: number;
	PowerPlay: number; // bool
	ServedPlayerFirstName: string;
	ServedPlayerId: number;
	ServedPlayerJerseyNumber: number;
	ServedPlayerLastName: string;
	Time: string;
	TimeOn: string;
	TimeOnSet: number;
	TimeStart: string;
	TimeStartSet: number;
}

export interface GamePenaltyData {
	DatePlayed: string;
	GamePenalties: {
		[eventId: string]: PenaltyEvent;
	};
}

export interface Penalties {
	games: {
		[gameId: string]: GamePenaltyData;
	};
}

// ============================================================================
// Faceoffs Models
// ============================================================================

export interface FaceoffEvent {
	LSEventId: number;
	LocationId: number; // 1-9 (ice zone location)
	LoserPlayerFirstName: string;
	LoserPlayerId: number;
	LoserPlayerJerseyNumber: number;
	LoserPlayerLastName: string;
	Orientation: number; // 0 or 1
	Period: number;
	Time: string;
	WinnerPlayerFirstName: string;
	WinnerPlayerId: number;
	WinnerPlayerJerseyNumber: number;
	WinnerPlayerLastName: string;
}

export interface GameFaceoffsData {
	DatePlayed: string;
	GameFaceoffs: {
		[eventId: string]: FaceoffEvent;
	};
}

export interface Faceoffs {
	games: {
		[gameId: string]: GameFaceoffsData;
	};
}

// ============================================================================
// Shots Summary Models
// ============================================================================

export interface PeriodInfo {
	LongName: string; // "1st", "2nd", "3rd", "1st OT"
	PeriodId: number;
	ShortName: string; // "1", "2", "3", "OT1"
}

export interface GameShotsSummaryData {
	DatePlayed: string;
	HomeShotTotal: number;
	HomeShotsByPeriod: (number | null)[]; // [null, 12, 11, 6]
	PeriodsInfo: (PeriodInfo | null)[]; // [null, {...}, {...}]
	VisitorShotTotal: number;
	VisitorShotsByPeriod: (number | null)[];
}

export interface ShotSummary {
	games: {
		[gameId: string]: GameShotsSummaryData;
	};
}

// ============================================================================
// MVP Models
// ============================================================================

export interface MVPPlayer {
	FirstName: string;
	JerseyNumber: number;
	LastName: string;
	PlayerId: number;
	PositionId: number;
	PositionName: string; // "C", "RW", "LW", "D", "G"
	TeamId: number;
	TeamName: string; // "Boston Fleet"
	TeamNickname: string; // "Fleet"
}

export interface MVPs {
	games: {
		[gameId: string]: MVPPlayer[]; // Array of MVPs (can be multiple per game)
	};
}

// ============================================================================
// Shootout Models
// ============================================================================

export interface ShootoutPlayer {
	FirstName: string;
	LastName: string;
	PlayerId: number;
	JerseyNumber: number;
	Goalie: boolean;
}

export interface ShootoutAttempt {
	Goal: boolean;
	Goalie: ShootoutPlayer;
	IsHome: boolean;
	LSEventId: number;
	Shooter: ShootoutPlayer;
}

export interface GameShootoutData {
	DatePlayed: string;
	ShootoutAttempts: {
		[eventId: string]: ShootoutAttempt;
	};
}

export interface Shootouts {
	games: {
		[gameId: string]: GameShootoutData;
	};
}

// ============================================================================
// All Live Data (Master Endpoint)
// ============================================================================

export interface AllLiveDataResponse {
	faceoffs: [null, Faceoffs];
	goals: [null, Goals];
	penalties: [null, Penalties];
	mvps: [null, MVPs];
	runningclock: [null, RunningClock];
	shootouts: [null, Shootouts];
	shotssummary: [null, ShotSummary];
	publishedclock?: [null, PublishedClock];
}
