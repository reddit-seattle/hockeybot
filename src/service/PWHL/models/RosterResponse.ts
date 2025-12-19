// Response from: /feed/index.php?feed=modulekit&view=roster&team_id=3&season_id=5

export interface PWHLRosterResponse {
	SiteKit: {
		Roster: Player[];
	};
}

export interface Player {
	player_id: string;
	jersey_number: string;
	first_name: string;
	last_name: string;
	position: string;
	position_type: string;
	height: string;
	weight: string;
	birthdate: string;
	birthtown: string;
	birthprov: string;
	birthcntry: string;
	shoots_catches: string;
	rookie: string;
	veteran: string;
	caption: string;
	alternate_caption: string;
	player_image: string;
	headshot_image: string;
}
