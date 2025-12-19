export interface PWHLStandingsResponse {
	SiteKit: {
		Gametypes: any[];
		Parameters: any;
		Statviewtype: Statviewtype;
	};
}

export interface Statviewtype {
	sections: Section[];
}

export interface Section {
	title: string;
	data: StandingData[];
}

export interface StandingData {
	row: TeamStanding;
}

export interface TeamStanding {
	rank: string;
	team_code: string;
	team_id: string;
	logo: string;
	name: string;
	division_long_name: string;
	division_short_name: string;
	games_played: string;
	wins: string;
	losses: string;
	ot_losses: string;
	ties: string;
	points: string;
	regulation_wins: string;
	shootout_wins: string;
	shootout_losses: string;
	goals_for: string;
	goals_against: string;
	non_reg_losses: string;
	percentage: string;
	home_record: string;
	away_record: string;
	shootout_record: string;
	ot_record: string;
	last_ten: string;
	streak: string;
}
