export interface PWHLGameSummaryResponse {
	GC: {
		Gamesummary: GameSummary;
	};
}

// TODO - proper typings
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
	txt_title?: string;
	txt_scoring?: string;
	txt_total?: string;
	txt_shots?: string;
	game_ident?: string;
	game_date?: string;
	game_length?: string;
	status_title?: string;
	status_value?: string;
	shootout?: string;
	visitor_division?: string;
	visitor_division_id?: string;
	home_division?: string;
	home_division_id?: string;
	mvp_type?: number;
	shootoutDetail?: any;
	mvps?: any;
	referee1?: string;
	referee2?: string;
	linesman1?: string;
	linesman2?: string;
	officialsOnIce?: any;
	officialsOffIce?: any;
	homeShootout?: number;
	visitorShootout?: number;
	benchGoalCount?: any;
	penalties?: any;
	goals?: any;
	goalies?: any;
	home_team_lineup?: any;
	visitor_team_lineup?: any;
	game_date_iso_8601?: string;
	coaches?: any;
	pimBench?: any;
	powerPlayGoals?: any;
	powerPlayCount?: any;
	goalCount?: any;
	assistCount?: any;
	pointsCount?: any;
	pimTotal?: any;
	infCount?: any;
	penaltyshots?: any;
	totalFaceoffs?: any;
	totalHits?: any;
	totalGoals?: any;
	totalShots?: any;
	totalShotsOn?: any;
}

// TODO - proper typings
export interface GameMeta {
	id: string;
	season_id: string;
	league_id: string;
	home_team: string;
	visiting_team: string;
	game_number: string;
	game_letter?: string;
	type_id?: string;
	if_necessary?: string;
	quick_score: string;
	mvp1?: string;
	mvp2?: string;
	mvp3?: string;
	featured_player_id?: string;
	date_played: string;
	schedule_time: string;
	timezone: string;
	start_time?: string;
	end_time?: string;
	forfeit?: string;
	shootout?: string;
	shootout_first_shooter_home?: string;
	attendance?: string;
	location?: string;
	home_coach?: string;
	home_assistant_coach1?: string;
	home_assistant_coach2?: string;
	home_manager?: string;
	visiting_coach?: string;
	visiting_assistant_coach1?: string;
	visiting_assistant_coach2?: string;
	visiting_manager?: string;
	period: string;
	game_clock: string;
	status: string;
	started?: string;
	game_length?: string;
	pending_final?: string;
	final?: string;
	home_goal_count?: string;
	visiting_goal_count?: string;
	public_notes?: string;
	private_notes?: string;
	league_game_notes?: string;
	visiting_team_notes?: string;
	home_team_notes?: string;
	capacity?: string;
	schedule_notes?: string;
	schedule_notes_fr?: string;
	home_audio_url?: string;
	home_video_url?: string;
	home_webcast_url?: string;
	home_audio_url_fr?: string;
	home_video_url_fr?: string;
	home_webcast_url_fr?: string;
	visiting_webcast_url?: string;
	visiting_video_url?: string;
	visiting_audio_url?: string;
	visiting_webcast_url_fr?: string;
	visiting_video_url_fr?: string;
	visiting_audio_url_fr?: string;
	tickets_url?: string;
	tickets_url_fr?: string;
	last_modified?: string;
	watch_now_url?: string;
	watch_now_droid_url?: string;
	home_goals_actual?: string;
	visiting_goals_actual?: string;
	htv_game_id?: string;
	imported_id?: string;
	flo_core_event_id?: string;
	flo_live_event_id?: string;
	start_time_without_seconds?: string;
	end_time_without_seconds?: string;
	"12_hour_start_time_without_seconds"?: string;
	"12_hour_end_time_without_seconds"?: string;
	length?: string;
	timezone_short?: string;
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
