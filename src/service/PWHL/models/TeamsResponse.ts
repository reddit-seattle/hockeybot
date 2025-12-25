export interface PWHLTeamsResponse {
	SiteKit: {
		Gametypes: any[];
		Parameters: any;
		Seasons: Season[];
		Teamsbyseason: Team[]; // Flat array of teams, not grouped by division
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

export interface Team {
	id: string;
	code: string;
	name: string;
	nickname: string;
	city: string;
	team_caption: string;
	division_id: string;
	division_long_name: string;
	division_short_name: string;
	team_logo_url: string;
}
