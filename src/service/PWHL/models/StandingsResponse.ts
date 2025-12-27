export interface PWHLStandingsResponse {
	SiteKit: {
		Gametypes: any[];
		Parameters: any;
		Statviewtype: TeamStanding[];
	};
}

export interface TeamStanding {
	// Header row indicator
	repeatheader?: number;

	// Team identification
	team_id?: string;
	name: string;
	nickname?: string;
	city?: string;
	team_code?: string;
	team_name?: string;
	teamname?: string;
	placeholder?: string;

	// Division/Conference
	division_id?: string;
	division_name?: string;
	divisname?: string;
	conference_name?: string;

	// Record
	games_played?: string;
	wins?: string;
	losses?: string;
	ties?: string;
	ot_losses?: string;
	reg_ot_losses?: string;
	reg_losses?: string;
	ot_wins?: string;
	shootout_wins?: string;
	non_reg_wins?: string;
	shootout_losses?: string;
	non_reg_losses?: string;
	regulation_wins?: string;
	row?: string;
	points?: string;

	// Stats
	bench_minutes?: string;
	penalty_minutes?: string;
	goals_for?: string;
	goals_against?: string;
	goals_diff?: string;
	power_play_goals?: string;
	power_play_goals_against?: string;
	shootout_goals?: string;
	shootout_goals_against?: string;
	shootout_attempts?: string;
	shootout_attempts_against?: string;
	short_handed_goals_for?: string;
	short_handed_goals_against?: string;

	// Percentages
	percentage?: string;
	percentage_full?: string;
	shootout_pct?: string;
	power_play_pct?: string;
	shootout_pct_goals_for?: string;
	shootout_pct_goals_against?: string;
	penalty_kill_pct?: string;
	win_percentage?: string;

	// Rankings
	rank?: number;
	overall_rank?: string;

	// Clinched status
	clinched_playoff_spot?: string;
	clinched_group_title?: string;
	clinched?: string;

	// Games breakdown
	shootout_games_played?: string;
	games_remaining?: string;

	// Additional stats
	pim_pg?: string;
	power_plays?: string;
	times_short_handed?: string;

	// Records
	streak?: string;
	shootout_record?: string;
	home_record?: string;
	visiting_record?: string;
	past_10?: string;
	past_10_wins?: string;
	past_10_losses?: string;
	past_10_ties?: string;
	past_10_ot_losses?: string;
	past_10_shootout_losses?: string;
}
