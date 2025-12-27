// Common types shared across PWHL API responses

export interface PWHLTeam {
	id: number;
	name: string;
	nickname: string;
	abbrev: string;
	logoUrl?: string;
}

export interface PWHLSeason {
	id: number;
	name: string;
	shortname: string;
	career: number;
	playoff: number;
	start_date: string;
	end_date: string;
}
