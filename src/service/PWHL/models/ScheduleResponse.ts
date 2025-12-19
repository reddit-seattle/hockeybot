export interface PWHLScheduleResponse {
	SiteKit: {
		Schedule: ScheduleGame[];
	};
}

export interface ScheduleGame {
	id: string;
	season_id: string;
	game_number: string;
	date: string;
	date_played: string;
	date_time: string;
	date_with_day: string;
	game_type: string;
	quick_score: string;
	home_team: string;
	home_team_city: string;
	home_nickname: string;
	home_team_code: string;
	home_goal_count: string;
	home_logo: string;
	visiting_team: string;
	visiting_team_city: string;
	visiting_nickname: string;
	visiting_team_code: string;
	visiting_goal_count: string;
	visiting_logo: string;
	status: string;
	game_status: string;
	started: string;
	final: string;
	double_header: string;
	double_header_game_num: string;
	home_audio: string;
	visiting_audio: string;
	game_letter: string;
	timezone: string;
	home_headshot: string;
	visiting_headshot: string;
	venue_name: string;
	venue_location: string;
	game_sheet_url: string;
	game_recap_url: string;
}
