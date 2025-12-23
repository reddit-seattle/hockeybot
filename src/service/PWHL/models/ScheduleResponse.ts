export interface PWHLScheduleResponse {
	SiteKit: {
		Schedule: ScheduleGame[];
	};
}

export interface Broadcaster {
	broadcaster_id: string;
	name: string;
	logo_url: string;
	url: string;
}

export interface ScheduleGame {
	// IDs and basic info
	id: string;
	game_id: string;
	season_id: string;
	game_number: string;

	// Dates and times
	date_played: string; // YYYY-MM-DD format
	date: string; // "Dec. 23" format
	date_with_day: string; // "Tue, Dec 23" format
	date_time_played: string; // ISO8601 with Z
	GameDateISO8601: string; // ISO8601 with timezone
	schedule_time: string; // HH:MM:SS format
	scheduled_time: string; // "7:00 pm EST" formatted
	timezone: string;

	// Teams
	home_team: string; // team ID
	visiting_team: string; // team ID
	home_team_name: string;
	home_team_code: string;
	home_team_nickname: string;
	home_team_city: string;
	home_team_division_long: string;
	home_team_division_short: string;
	visiting_team_name: string;
	visiting_team_code: string;
	visiting_team_nickname: string;
	visiting_team_city: string;
	visiting_team_division_long: string;
	visiting_team_division_short: string;

	// Score and game state
	quick_score: string;
	home_goal_count: string;
	visiting_goal_count: string;
	period: string;
	period_trans: string;
	game_clock: string;
	overtime: string;
	shootout: string;
	intermission: string;

	// Status
	status: string;
	game_status: string; // Can be time like "7:00 pm EST" for upcoming games
	started: string; // "0" or "1"
	final: string; // "0" or "1"

	// Game type and metadata
	game_type: string;
	game_letter: string;
	if_necessary: string;
	use_shootouts: string;
	schedule_notes: string;
	notes_text: string;

	// Venue
	location: string;
	venue_name: string;
	venue_url: string;
	venue_location: string;

	// Media and URLs
	tickets_url: string;
	home_audio_url: string;
	visiting_audio_url: string;
	flo_core_event_id: string;
	flo_live_event_id: string;
	htv_game_id: string;
	mobile_calendar: string;

	// Broadcasters
	broadcasters?: {
		home_video?: Broadcaster[];
		visiting_video?: Broadcaster[];
		home_audio?: Broadcaster[];
		visiting_audio?: Broadcaster[];
	};

	// System fields
	attendance: string;
	last_modified: string;
	client_code: string;
}
