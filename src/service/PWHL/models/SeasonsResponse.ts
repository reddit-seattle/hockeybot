export interface PWHLSeasonsResponse {
	SiteKit: {
		Parameters: {
			feed: string;
			view: string;
			key: string;
			client_code: string;
			league_id: string;
			season_id: string;
		};
		Seasons: Season[];
		Copyright: {
			required_copyright: string;
			required_link: string;
			powered_by: string;
			powered_by_url: string;
		};
	};
}

export interface Season {
	season_id: string;
	season_name: string;
	shortname: string;
	career: string; // "1" = counts toward career stats (regular + playoffs), "0" = doesn't count (preseason)
	playoff: string; // "1" = playoffs, "0" = regular season or preseason
	start_date: string; // YYYY-MM-DD
	end_date: string; // YYYY-MM-DD
}
