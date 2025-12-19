export interface PWHLTeamsResponse {
	SiteKit: {
		Gametypes: any[];
		Parameters: any;
		Seasons: Season[];
		Teamsbydivision: Teamsbydivision[];
	};
}

export interface Season {
	career: string;
	end_date: string;
	name: string;
	playoff: string;
	season_id: string;
	start_date: string;
}

export interface Teamsbydivision {
	division_id: string;
	division_long_name: string;
	division_name: string;
	division_short_name: string;
	teams: Team[];
}

export interface Team {
	team_code: string;
	team_id: string;
	league_id: string;
	name: string;
	nickname: string;
	short_name: string;
	city: string;
	team_url: string;
	logo: string;
	division_id: string;
	division_long_name: string;
	division_short_name: string;
	conference_id: string;
	conference_name: string;
}
