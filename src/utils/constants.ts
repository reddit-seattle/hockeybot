import dotenv from "dotenv";
import { Play } from "../service/MLB/models/GameFeed";
import { EventTypeCode, GameState, GoalShotType, PenaltyType } from "./enums";
dotenv.config();

// TODO - separate MLB and NHL constants
// TODO - move to env vars / customization
export namespace Config {
	export const DAILY_SCHEDULE_CRON = "0 0 9 * * *"; // Every day at 9am
	export const GAME_CHECKER_CRON = "0 0,30 9,10 * * *"; // 9:00, 9:30, 10:00, 10:30 AM
	export const TIME_ZONE = "America/Los_Angeles";
	export const BODY_DATE_FORMAT = `iii PP @ p`; // "Thu Dec 28, 2023 @ 4:16 PM"
	export const TITLE_DATE_FORMAT = `iii PP`;
	export const TRACKED_NHL_EVENT_TYPES = [
		EventTypeCode.goal,
		EventTypeCode.penalty,
		EventTypeCode.periodStart,
		EventTypeCode.periodEnd,
	];
	export const TRACKED_MLB_EVENT_TYPES = [
		"home_run",
		"triple",
		"double",
		"single",
		"walk",
		"hit_by_pitch",
		"sac_fly",
		"grounded_into_double_play",
		"field_error",
	];
	export const doesThisMLBPlayMatter = (play: Play) => {
		return !play.result
			? false
			: play.about.isComplete &&
					// if it's an event we care about
					(TRACKED_MLB_EVENT_TYPES.includes(play.result.eventType) ||
						// or if it scored a run regardless
						play.result.rbi > 0);
	};
	export const LOCAL_TIME_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
		hour: "numeric",
		minute: "2-digit",
		timeZone: TIME_ZONE,
	};
}
export namespace StoryStatCategories {
	export const FACEOFF_WIN_PCT = "faceoffWinningPctg";
	export const POWER_PLAY = "powerPlay";
	export const POWER_PLAY_PCT = "powerPlayPctg";
	export const PIM = "pim";
	export const HITS = "hits";
	export const BLOCKED_SHOTS = "blockedShots";
	export const GIVEAWAYS = "giveaways";
	export const TAKEAWAYS = "takeaways";
	export const SHOTS = "sog";
	export const TIME_ON_PUCK = "timeOnPuck";
}

// TODO - move to env vars / customization
export namespace Colors {
	export const KRAKEN_EMBED = 39129;
	export const MARINERS = 0x005c5c; // Teal
}

export const MLBTeamColors: { [teamId: number]: number } = {
	// American League East
	110: 0xdf4601, // Baltimore Orioles - Orange
	111: 0xbd3039, // Boston Red Sox - Red
	147: 0x003087, // New York Yankees - Navy
	139: 0x092c5c, // Tampa Bay Rays - Navy Blue
	141: 0x134a8e, // Toronto Blue Jays - Blue

	// American League Central
	145: 0x27251f, // Chicago White Sox - Black
	114: 0x00385d, // Cleveland Guardians - Navy
	116: 0x0c2340, // Detroit Tigers - Navy
	118: 0x004687, // Kansas City Royals - Royal Blue
	142: 0x002b5c, // Minnesota Twins - Navy

	// American League West
	117: 0xeb6e1f, // Houston Astros - Orange
	108: 0xba0021, // Los Angeles Angels - Red
	133: 0x003831, // Oakland Athletics - Green
	136: 0x005c5c, // Seattle Mariners - Northwest Green (Navy: 0x0C2C56 as alternate)
	140: 0x003278, // Texas Rangers - Blue

	// National League East
	144: 0xce1141, // Atlanta Braves - Red
	146: 0x00a3e0, // Miami Marlins - Blue
	121: 0x002d72, // New York Mets - Blue
	143: 0xe81828, // Philadelphia Phillies - Red
	120: 0xab0003, // Washington Nationals - Red

	// National League Central
	112: 0x0e3386, // Chicago Cubs - Blue
	113: 0xc6011f, // Cincinnati Reds - Red
	158: 0xffc52f, // Milwaukee Brewers - Gold
	134: 0xfdb827, // Pittsburgh Pirates - Gold
	138: 0xc41e3a, // St. Louis Cardinals - Red

	// National League West
	109: 0xa71930, // Arizona Diamondbacks - Sedona Red
	115: 0x33006f, // Colorado Rockies - Purple
	119: 0x005a9c, // Los Angeles Dodgers - Dodger Blue
	135: 0x2f241d, // San Diego Padres - Brown
	137: 0xfd5a1e, // San Francisco Giants - Orange
};

// Gets the primary color for an MLB team by team ID
export function getMLBTeamColor(teamId: number): number {
	return MLBTeamColors[teamId] ?? Colors.MARINERS;
}

export namespace Strings {
	export const GAMEDAY_THREAD_TITLE = "Game Day Thread";
	export const REDLIGHT_EMBED = "<a:redlight:892194335951581247>";
	export const ZERO_WIDTH_SPACE = "​";
	export const PENALTY_STRINGS = {
		[PenaltyType.PS_COVERING_PUCK_IN_CREASE]: "Penalty Shot - Covering puck in crease",
		[PenaltyType.PS_GOALKEEPER_DISPLACED_NET]: "Penalty Shot - Goalkeeper displaced net",
		[PenaltyType.PS_HOLDING_ON_BREAKAWAY]: "Penalty Shot - Holding on breakaway",
		[PenaltyType.PS_HOOKING_ON_BREAKAWAY]: "Penalty Shot - Hooking on breakaway",
		[PenaltyType.PS_NET_DISPLACED]: "Penalty Shot - Net displaced",
		[PenaltyType.PS_SLASH_ON_BREAKAWAY]: "Penalty Shot - Slashing on breakaway",
		[PenaltyType.PS_THROWING_OBJECT_AT_PUCK]: "Penalty Shot - Throwing object at puck",
		[PenaltyType.PS_TRIPPING_ON_BREAKAWAY]: "Penalty Shot - Tripping on breakaway",
		[PenaltyType.ABUSE_OF_OFFICIALS]: "Abuse of officials",
		[PenaltyType.BENCH]: "Bench penalty",
		[PenaltyType.BOARDING]: "Boarding",
		[PenaltyType.BROKEN_STICK]: "Playing with broken stick",
		[PenaltyType.CHARGING]: "Charging",
		[PenaltyType.CLIPPING]: "Clipping",
		[PenaltyType.CLOSING_HAND_ON_PUCK]: "Closing hand on puck",
		[PenaltyType.CROSS_CHECKING]: "Cross-checking",
		[PenaltyType.DELAYING_GAME]: "Delay of game",
		[PenaltyType.DELAYING_GAME_BENCH]: "Delay of game: bench",
		[PenaltyType.DELAYING_GAME_BENCH_FACE_OFF_VIOLATION]: "Delay of game: bench face-off violation",
		[PenaltyType.DELAYING_GAME_EQUIPMENT]: "Delay of game: equipment",
		[PenaltyType.DELAYING_GAME_FACE_OFF_VIOLATION]: "Delay of game: face-off violation",
		[PenaltyType.DELAYING_GAME_PUCK_OVER_GLASS]: "Delay of game: puck over glass",
		[PenaltyType.DELAYING_GAME_SMOTHERING_PUCK]: "Delay of game: mothering puck",
		[PenaltyType.DELAYING_GAME_UNSUCCESSFUL_CHALLENGE]: "Unsuccessful challenge",
		[PenaltyType.ELBOWING]: "Elbowing",
		[PenaltyType.EMBELLISHMENT]: "Embellishment",
		[PenaltyType.GOALIE_LEAVE_CREASE]: "Goalie left crease",
		[PenaltyType.GOALIE_PARTICIPATION_BEYOND_CENTER]: "Goalie beyond center",
		[PenaltyType.HIGH_STICKING]: "High-sticking",
		[PenaltyType.HOLDING]: "Holding",
		[PenaltyType.HOLDING_THE_STICK]: "Holding the stick",
		[PenaltyType.HOOKING]: "Hooking",
		[PenaltyType.ILLEGAL_CHECK_TO_HEAD]: "Illegal check to head",
		[PenaltyType.ILLEGAL_STICK]: "Illegal stick",
		[PenaltyType.INSTIGATOR]: "Instigator",
		[PenaltyType.INTERFERENCE]: "Interference",
		[PenaltyType.INTERFERENCE_BENCH]: "Bench interference",
		[PenaltyType.INTERFERENCE_GOALKEEPER]: "Goalkeeper interference",
		[PenaltyType.KNEEING]: "Kneeing",
		[PenaltyType.PLAYING_WITHOUT_A_HELMET]: "Playing without helmet",
		[PenaltyType.PUCK_THROWN_FORWARD_GOALKEEPER]: "Goalie threw puck forward",
		[PenaltyType.ROUGHING]: "Roughing",
		[PenaltyType.ROUGHING_REMOVING_OPPONENTS_HELMET]: "Roughing: removing opponent's helmet",
		[PenaltyType.SLASHING]: "Slashing",
		[PenaltyType.THROWING_EQUIPMENT]: "Throwing equipment",
		[PenaltyType.TOO_MANY_MEN_ON_THE_ICE]: "Too many men on ice",
		[PenaltyType.TRIPPING]: "Tripping",
		[PenaltyType.UNSPORTSMANLIKE_CONDUCT]: "Unsportsmanlike conduct",
		[PenaltyType.UNSPORTSMANLIKE_CONDUCT_BENCH]: "Bench unsportsmanlike conduct",
		[PenaltyType.HIGH_STICKING_DOUBLE_MINOR]: "High-sticking double minor",
		[PenaltyType.SPEARING_DOUBLE_MINOR]: "Spearing double minor",
		[PenaltyType.CHECKING_FROM_BEHIND]: "Checking from behind",
		[PenaltyType.FIGHTING]: "Fighting",
		[PenaltyType.SPEARING]: "Spearing",
		[PenaltyType.ABUSIVE_LANGUAGE]: "Abusive language",
		[PenaltyType.AGGRESSOR]: "Aggressor",
		[PenaltyType.GAME_MISCONDUCT]: "Game misconduct",
		[PenaltyType.INSTIGATOR_MISCONDUCT]: "Instigator - Misconduct",
		[PenaltyType.MISCONDUCT]: "Misconduct",
		[PenaltyType.MATCH_PENALTY]: "Match penalty",
	};
	export const GOAL_TYPE_STRINGS = {
		[GoalShotType.WRIST]: "Wrist shot",
		[GoalShotType.SLAP]: "Slap shot",
		[GoalShotType.SNAP]: "Snap shot",
		[GoalShotType.BACKHAND]: "Backhand",
		[GoalShotType.TIP_IN]: "Tip-in",
		[GoalShotType.DEFLECTED]: "Deflection",
		[GoalShotType.WRAP_AROUND]: "Wrap-around",
		[GoalShotType.POKE]: "Poke",
		[GoalShotType.BAT]: "Batted in",
		[GoalShotType.CRADLE]: "Cradled",
		[GoalShotType.BETWEEN_LEGS]: "Between-the-legs",
	};
}

export namespace Environment {
	// Token
	export const botToken = process.env["bot_token"] || undefined;

	// NHL Configuration
	// Channel for NHL game threads
	export const GAMEDAY_CHANNEL_ID = process.env["HOCKEYBOT_CHANNEL_ID"] || undefined;
	// NHL Team to track games
	export const HOCKEYBOT_TEAM_ID = process.env["HOCKEYBOT_TEAM_ID"];
	// NHL Team name display
	export const HOCKEYBOT_TEAM_NAME = process.env["HOCKEYBOT_TEAM_NAME"] || "Seattle Kraken";
	// Team emoji reference (e.g., "SEA" for :SEA:)
	export const HOCKEYBOT_TEAM_EMOJI = process.env["HOCKEYBOT_TEAM_EMOJI"] || "SEA";

	// MLB Configuration
	// Channel for MLB game threads
	export const HOCKEYBOT_MLB_CHANNEL_ID = process.env["HOCKEYBOT_MLB_CHANNEL_ID"] || undefined;
	// MLB Team to track games (team ID from MLB API)
	export const HOCKEYBOT_MLB_TEAM_ID = process.env["HOCKEYBOT_MLB_TEAM_ID"];
	// MLB Team name display
	export const HOCKEYBOT_MLB_TEAM_NAME = process.env["HOCKEYBOT_MLB_TEAM_NAME"] || "Seattle Mariners";

	// PWHL Configuration
	// Channel for PWHL game threads
	export const HOCKEYBOT_PWHL_CHANNEL_ID = process.env["HOCKEYBOT_PWHL_CHANNEL_ID"] || undefined;
	// PWHL Team to track games (team ID from PWHL HockeyTech API)
	export const HOCKEYBOT_PWHL_TEAM_ID = process.env["HOCKEYBOT_PWHL_TEAM_ID"];
	// PWHL Team name display
	export const HOCKEYBOT_PWHL_TEAM_NAME = process.env["HOCKEYBOT_PWHL_TEAM_NAME"] || "Seattle Torrent";
	// Team code/abbreviation (e.g., "SEA", "TOR", "MTL", etc.)
	export const HOCKEYBOT_PWHL_TEAM_CODE = process.env["HOCKEYBOT_PWHL_TEAM_CODE"] || "SEA";
	// PWHL Firebase auth token for real-time API access
	export const HOCKEYBOT_PWHL_AUTH_TOKEN = process.env["HOCKEYBOT_PWHL_AUTH_TOKEN"];


	// Channel for general debug messages
	export const DEBUG_CHANNEL_ID = process.env["GUILD_DEBUG_CHANNEL_ID"] || undefined;
	// Local / debug run flag
	export const LOCAL_RUN = process.env["local_run"] ? true : false;
}

export enum EventTypes {
	Goal = "GOAL",
}

export enum GameStates {
	FINAL = "7",
	ALMOST_FINAL = "6",
	GAME_OVER = "5",
	CRITICAL = "4",
	IN_PROGRESS = "3",
	PRE_GAME = "2",
	POSTPONED = "9",
	PREVIEW_TBD = "8",
	PREVIEW = "1",
}

export enum GameTypes {
	PRESEASON = "PR",
	REGULAR = "R",
	PLAYOFFS = "P",
	ALLSTAR = "A",
	WOMENSALLSTAR = "WA",
	OLYMPIC = "O",
}

export enum PlayerTypes {
	Scorer = "Scorer",
	Shooter = "Shooter",
	Goalie = "Goalie",
}

// Game states that indicate a game has started and we should track events
export const STARTED_STATES = [GameState.pregame, GameState.live, GameState.critical];

// Thread manager state machine
export enum ThreadManagerState {
	INITIALIZED = "INITIALIZED",
	PREGAME = "PREGAME",
	TRACKING_EVENTS = "TRACKING_EVENTS",
	LIVE = "LIVE",
	COMPLETED = "COMPLETED",
	ERROR = "ERROR",
}

export interface Record {
	Wins: number;
	Losses: number;
	Overtime: number;
}

export namespace Paths {
	export namespace PWHL {
		/**
		 * PWHL uses the HockeyTech API via LeagueStat cluster
		 * Base: https://lscluster.hockeytech.com/feed/
		 * All endpoints require: key=446521baf8c38984&client_code=pwhl
		 *
		 * Note: Season IDs are fetched dynamically from the API using API.Season.GetCurrentSeasonId()
		 * to avoid hardcoding values that need updating every season.
		 */
		export const API_ENDPOINT = "https://lscluster.hockeytech.com/feed";
		export const API_KEY = "446521baf8c38984";
		export const CLIENT_CODE = "pwhl";

		const buildUrl = (params: { [key: string]: string }) => {
			const queryParams = new URLSearchParams({
				...params,
				key: API_KEY,
				client_code: CLIENT_CODE,
			});
			return `${API_ENDPOINT}/index.php?${queryParams.toString()}`;
		};

		export namespace Season {
			// https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=seasons&key=...&client_code=pwhl
			export const All = () => buildUrl({ feed: "modulekit", view: "seasons" });

			// https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=seasons&key=...&client_code=pwhl
			export const Current = () => buildUrl({ feed: "modulekit", view: "seasons" });
		}

		export namespace Teams {
			// https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=teamsbyseason&season_id=5&key=...&client_code=pwhl
			export const BySeasonId = (seasonId: string) =>
				buildUrl({ feed: "modulekit", view: "teamsbyseason", season_id: seasonId });

			// https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=roster&team_id=3&season_id=5&key=...&client_code=pwhl
			export const Roster = (teamId: string, seasonId: string) =>
				buildUrl({ feed: "modulekit", view: "roster", team_id: teamId, season_id: seasonId });
		}

		export namespace Schedule {
			// https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=schedule&season_id=5&key=...&client_code=pwhl
			export const BySeason = (seasonId: string) =>
				buildUrl({ feed: "modulekit", view: "schedule", season_id: seasonId });

			// https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=schedule&team_id=3&season_id=5&key=...&client_code=pwhl
			export const ByTeam = (teamId: string, seasonId: string) =>
				buildUrl({ feed: "modulekit", view: "schedule", team_id: teamId, season_id: seasonId });

			// https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=gamesperday&start_date=2023-01-01&end_date=2026-01-01&key=...&client_code=pwhl
			export const ByDateRange = (startDate: string, endDate: string) =>
				buildUrl({ feed: "modulekit", view: "gamesperday", start_date: startDate, end_date: endDate });

			// https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=scorebar&numberofdaysback=1000&numberofdaysahead=1000&key=...&client_code=pwhl
			export const Scorebar = (daysBack: number = 1000, daysAhead: number = 1000) =>
				buildUrl({
					feed: "modulekit",
					view: "scorebar",
					numberofdaysback: daysBack.toString(),
					numberofdaysahead: daysAhead.toString(),
				});
		}

		export namespace Standings {
			// https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=statviewtype&stat=conference&type=standings&season_id=5&key=...&client_code=pwhl
			export const Current = (seasonId: string) =>
				buildUrl({
					feed: "modulekit",
					view: "statviewtype",
					stat: "conference",
					type: "standings",
					season_id: seasonId,
				});
		}

		export namespace Games {
			// https://lscluster.hockeytech.com/feed/index.php?feed=gc&tab=preview&game_id=137&key=...&client_code=pwhl
			export const Preview = (gameId: string) => buildUrl({ feed: "gc", tab: "preview", game_id: gameId });

			// https://lscluster.hockeytech.com/feed/index.php?feed=gc&tab=clock&game_id=137&key=...&client_code=pwhl
			export const Clock = (gameId: string) => buildUrl({ feed: "gc", tab: "clock", game_id: gameId });

			// https://lscluster.hockeytech.com/feed/index.php?feed=gc&tab=pxpverbose&game_id=137&key=...&client_code=pwhl
			export const PlayByPlay = (gameId: string) => buildUrl({ feed: "gc", tab: "pxpverbose", game_id: gameId });

			// https://lscluster.hockeytech.com/feed/index.php?feed=gc&tab=gamesummary&game_id=137&key=...&client_code=pwhl
			export const Summary = (gameId: string) =>
				buildUrl({ feed: "gc", tab: "gamesummary", game_id: gameId, site_id: "0", lang: "en" });
		}

		/**
		 * Real-Time API Endpoints
		 * Base: https://leaguestat-b9523.firebaseio.com/svf/pwhl/
		 */
		export namespace Live {
			export const BASE_URL = "https://leaguestat-b9523.firebaseio.com/svf/pwhl";
			export const AUTH_TOKEN = Environment.HOCKEYBOT_PWHL_AUTH_TOKEN || "";

			const buildEndpoint = (endpoint: string) => {
				return `${BASE_URL}${endpoint}?auth=${AUTH_TOKEN}`;
			};

			// All live game data in one call
			export const AllLiveData = () => buildEndpoint(".json");

			// Clock endpoints
			export const RunningClock = () => buildEndpoint("/runningclock.json");
			export const PublishedClock = () => buildEndpoint("/publishedclock.json");

			// Event endpoints
			export const Goals = () => buildEndpoint("/goals.json");
			export const Penalties = () => buildEndpoint("/penalties.json");
			export const Faceoffs = () => buildEndpoint("/faceoffs.json");

			// Stats endpoints
			export const ShotsSummary = () => buildEndpoint("/shotssummary.json");
		}
	}

	export namespace NHL {
		/***
		 * All games today:               https://api-web.nhle.com/v1/schedule/now
		 * Calendar Schedule?:            https://api-web.nhle.com/v1/schedule-calendar/2023-12-21
		 * This week's kraken games:      https://api-web.nhle.com/v1/club-schedule/SEA/week/now
		 * This month's kraken games:     https://api-web.nhle.com/v1/club-schedule/SEA/month/now
		 * This season's kraken games:    https://api-web.nhle.com/v1/club-schedule-season/SEA/now
		 */
		export const API_ENDPOINT = "https://api-web.nhle.com/v1";
		export namespace Schedule {
			const URL: string = `${API_ENDPOINT}/schedule`;
			const CALENDAR_URL: string = `${URL}-calendar`;

			export const AllGames: (date?: string) => string = (date?) => `${URL}/${date || "now"}`;
			// TODO - API
			export const ScheduleCalendar: (date?: string) => string = (date?) => `${CALENDAR_URL}/${date || "now"}`;
			export const TeamWeeklySchedule: (abbreviation: string) => string = (abbreviation) =>
				`${API_ENDPOINT}/club-schedule/${abbreviation}/week/now`;
			export const TeamMonthlySchedule: (abbreviation: string) => string = (abbreviation) =>
				`${API_ENDPOINT}/club-schedule/${abbreviation}/month/now`;
			export const TeamSeasonSchedule: (abbreviation: string) => string = (abbreviation) =>
				`${API_ENDPOINT}/club-schedule-season/${abbreviation}/now`;
		}

		export namespace Teams {
			export const ROSTER_URL = `${API_ENDPOINT}/roster`;
			export const SEASON_URL = `${API_ENDPOINT}/roster-season`;

			// https://api-web.nhle.com/v1/roster-season/sea -> [20212022, 20222023, 20232024]
			export const RosterSeasons = (team: string) => `${SEASON_URL}/${team}`;

			// https://api-web.nhle.com/v1/roster/sea/20232024
			export const Roster = (team: string, season: number) => `${URL}/${team}/${season}`;
		}
		// TODO - API
		export namespace Stats {
			const STATS_URL = `${API_ENDPOINT}/club-stats`;
			const SEASON_URL = `${API_ENDPOINT}/club-stats-season`;

			// https://api-web.nhle.com/v1/club-stats-season/sea
			export const StatSeasons = (team: string) => `${SEASON_URL}/${team}`;

			// https://api-web.nhle.com/v1/club-stats/sea/now
			export const TeamCurrentStats = (team: string) => `${STATS_URL}/${team}/now`;

			// https://api-web.nhle.com/v1/club-stats/sea/20232024/2
			export const TeamSeasonPlayerStats = (team: string, season: string, playoffs?: boolean) =>
				`${STATS_URL}/${team}/${season}/${playoffs ? 3 : 2}`;

			// https://api-web.nhle.com/v1/player/8475831/landing
			export const PlayerStatsSummary = (player: string) => `${API_ENDPOINT}/player/${player}/landing`;
			// https://api-web.nhle.com/v1/player/8475831/game-log/now
			export const PlayerGameLog = (player: string) => `${API_ENDPOINT}/player/${player}/game-log/now`;
		}
		export namespace Standings {
			// `https://api-web.nhle.com/v1/standings-season`; // can be used for  different year's standings values, whether they allow ties / wildcards etc
			// `https://api-web.nhle.com/v1/standings/now`;
			const URL = `${API_ENDPOINT}/standings`;
			export const CurrentStandings = `${URL}/now`;
		}
		export namespace Games {
			const SCORE_URL = `${API_ENDPOINT}/score`;
			const SCOREBOARD_URL = `${API_ENDPOINT}/scoreboard`;

			// https://api-web.nhle.com/v1/scoreboard/sea/now
			export const Scoreboard = (team?: string) => `${SCOREBOARD_URL}/${team ?? ""}/now`;
			// https://api-web.nhle.com/v1/wsc/game-story/2024020543
			export const Story = (id: string) => `${API_ENDPOINT}/wsc/game-story/${id}`;
			// Today's games: https://api-web.nhle.com/v1/score/now
			// Dated games:   https://api-web.nhle.com/v1/score/2023-10-19
			export const ByDate: (date?: string) => string = (date) => `${SCORE_URL}/${date || "now"}`;
			export namespace Live {
				export const URL = `${API_ENDPOINT}/gamecenter`;
				export const Game = (id: string) => {
					const GAME_URL = `${URL}/${id}`;
					return {
						// https://api-web.nhle.com/v1/gamecenter/2023020495/boxscore
						BoxScore: `${GAME_URL}/boxscore`,
						// https://api-web.nhle.com/v1_1/gamecenter/2023020001/play-by-play/
						PlayByPlay: `${GAME_URL}/play-by-play`,
					};
				};
			}
		}
		export namespace Search {
			const URL = "https://search.d3.nhle.com/api/v1/search";
			// https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=20&q=gir%2A&active=true
			export const Player = (player: string) => `${URL}/player?culture=en-us&limit=25&q=${player}%2A&active=true`;
		}

		export namespace Rest {
			const URL = `https://api.nhle.com/stats/rest/en`;
			const teamEndpoint = `${URL}/team`;
			export const TeamInfoByTriCode = (team: string) => `${teamEndpoint}/?cayenneExp=triCode="${team}"`;
			export const AllTeamSummaries = (season: string) => `${teamEndpoint}/summary?cayenneExp=seasonId=${season}`;
		}

		export namespace Seasons {
			const URL = `${API_ENDPOINT}/season`;
			export const All = URL;
		}

		export namespace Playoffs {
			// https://api-web.nhle.com/v1/playoff-series/carousel/20232024/
			export const Carousel = (season: string) => `${API_ENDPOINT}/playoff-series/carousel/${season}`;
			// https://api-web.nhle.com/v1/schedule/playoff-series/20232024/a
			export const Series = (season: string, matchup: string) =>
				`${API_ENDPOINT}/schedule/playoff-series/${season}/${matchup}`;
			// https://api-web.nhle.com/v1/playoff-bracket/2022
			export const Bracket = (year: string) => `${API_ENDPOINT}/playoff-bracket/${year}`;
		}
	}
	export namespace MLB {
		const API_V1 = "https://statsapi.mlb.com/api/v1";
		const API_V1_1 = "https://statsapi.mlb.com/api/v1.1";
		const SPORT_ID = 1;

		export namespace Schedule {
			export const All = `${API_V1}/schedule?sportId=${SPORT_ID}`;

			export interface ScheduleFilterParams {
				date?: string;
				teamId?: string;
				seasonId?: string;
				opponentId?: string;
				startDate?: string;
				endDate?: string;
			}

			/**
			 *
			 * @param date - YYYY-MM-DD format (only show games for certain date)
			 * @param teamId - MLB team ID (only show games for certain team)
			 * @param season - YYYY format (all games for season)
			 * @returns URL for filtered schedule endpoint
			 */
			export const Filtered = (params: ScheduleFilterParams) => {
				const queryParams = Object.entries(params)
					.filter(([_, value]) => value !== undefined)
					.map(([key, value]) => `&${key}=${encodeURIComponent(value!)}`)
					.join("");

				return `${All}${queryParams}`;
			};
		}

		export namespace Teams {
			export const All = `${API_V1}/teams`;
			export const ById = (id: string) => `${API_V1}/teams/${id}`;
		}

		export namespace Standings {
			export const Current = `${API_V1}/standings`;
		}

		export namespace Games {
			export const ById = (id: string) => `${API_V1_1}/game/${id}/feed/live`;
		}
		export const Seasons = `${API_V1}/seasons?sportId=${SPORT_ID}`;
	}
}
