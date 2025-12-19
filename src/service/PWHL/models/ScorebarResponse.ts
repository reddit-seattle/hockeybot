export interface PWHLScorebarResponse {
	SiteKit: {
		Scorebar: Game[];
	};
}

export interface Game {
	ID: string;
	SeasonID: string;
	league_id: string;
	league_code: string;
	league_name: string;
	game_number: string;
	game_letter: string;
	game_type: string;
	Date: string;
	GameDate: string;
	GameDateISO8601: string;
	Timezone: string;
	TimezoneShort: string;
	ScheduledTime: string;
	ScheduledFormattedTime: string;
	Ord: string;

	// Home Team
	HomeID: string;
	HomeCode: string;
	HomeCity: string;
	HomeNickname: string;
	HomeLongName: string;
	HomeGoals: string;
	HomeShots: string;
	HomeLogo: string;
	HomeRecord: string;
	HomeDivision: string;
	HomeWins: string;
	HomeRegulationLosses: string;
	HomeOTLosses: string;
	HomeShootoutLosses: string;
	HomeVideoUrl: string;
	HomeAudioUrl: string;
	HomeWebcastUrl?: string;

	// Visitor Team
	VisitorID: string;
	VisitorCode: string;
	VisitorCity: string;
	VisitorNickname: string;
	VisitorLongName: string;
	VisitorGoals: string;
	VisitorShots: string;
	VisitorLogo: string;
	VisitorRecord: string;
	VisitorDivision: string;
	VisitorWins: string;
	VisitorRegulationLosses: string;
	VisitorOTLosses: string;
	VisitorShootoutLosses: string;
	VisitorVideoUrl: string;
	VisitorAudioUrl: string;
	VisitorWebcastUrl: string;

	// Game Status
	GameStatus: string;
	GameStatusString: string;
	GameStatusStringLong: string;
	Period: string;
	PeriodNameShort: string;
	PeriodNameLong: string;
	Intermission: string;
	Clock: string;
	GameClock: string;
	quick_score: string;

	// Venue
	venue_name: string;
	venue_location: string;

	// URLs
	TicketUrl: string;
	GameSummaryUrl: string;
	FloLiveEventId: string;
	FloCoreEventId: string;
	FloHockeyUrl: string;

	// Legacy fields?
	Venue?: string;
	VenueLocation?: string;
	GameReportUrl?: string;
	GameCenterUrl?: string;
	combined_client_code?: string | null;
}
