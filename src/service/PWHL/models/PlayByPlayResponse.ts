export interface PlayByPlayResponse {
	GC: {
		Parameters: {
			feed: string;
			tab: string;
			game_id: string;
			key: string;
			client_code: string;
			fmt: string;
		};
		Pxpverbose: PBPEvent[];
	};
}

export type PBPEventType = "goal" | "penalty" | "shot" | "faceoff" | "hit" | "blocked_shot" | "goalie_change";

export interface PBPEvent {
	id?: string; // some events don't have an ID?!

	event: PBPEventType; // manual enum
	period?: string;
	period_id?: string;
	time?: string;
	time_formatted?: string;
	s?: number; // seconds into game

	// Goal-specific fields
	goal_type?: string;
	home?: string;
	team_id?: string;
	goal_player_id?: string;
	assist1_player_id?: string;
	assist2_player_id?: string;
	x_location?: number;
	y_location?: number;
	location_set?: string;
	power_play?: string;
	empty_net?: string;
	penalty_shot?: string;
	short_handed?: string;
	insurance_goal?: string;
	game_winning?: string;
	game_tieing?: string;
	scorer_goal_num?: string;
	plus?: PlayerInfo[];
	minus?: PlayerInfo[];
	goal_scorer?: PlayerInfo;
	assist1_player?: PlayerInfo;
	assist2_player?: PlayerInfo;

	// Penalty-specific fields
	player_id?: string;
	player_served?: string;
	offence?: string;
	pp?: string;
	time_off_formatted?: string;
	bench?: string;
	minutes?: string;
	minutes_formatted?: string;
	penalty_class_id?: string;
	penalty_class?: string;
	lang_penalty_description?: string;
	player_penalized_info?: PlayerInfo;
	player_served_info?: PlayerInfo;

	// Shot-specific fields
	player_team_id?: string;
	goalie_team_id?: string;
	goalie_id?: string;
	shot_type?: string;
	shot_type_description?: string;
	shot_quality_description?: string;
	quality?: string;
	game_goal_id?: string;
	player?: PlayerInfo;
	goalie?: PlayerInfo;

	// Faceoff-specific fields
	home_player_id?: string;
	visitor_player_id?: string;
	home_win?: string;
	location_id?: string;
	win_team_id?: string;
	player_home?: PlayerInfo;
	player_visitor?: PlayerInfo;

	// Hit-specific fields
	hitter?: PlayerInfo;
	hit_type?: string;

	// Blocked shot-specific fields
	game_id?: string;
	blocker_player_id?: string;
	blocker_team_id?: string;
	orientation?: string;
	seconds?: string;
	period_long_name?: string;
	blocker?: PlayerInfo;

	// Goalie change-specific fields
	goalie_in_id?: string | null;
	goalie_out_id?: string | null;
	team_code?: string;
	goalie_in_info?:
		| PlayerInfo
		| { player_id: null; jersey_number: null; team_id: null; team_code: null; first_name: null; last_name: null };
	goalie_out_info?: PlayerInfo;
}

export interface PlayerInfo {
	player_id: string;
	jersey_number: string;
	team_id: string;
	team_code: string;
	first_name: string;
	last_name: string;
}
