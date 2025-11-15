import { Stats } from "fs";

export interface GameFeedResponse {
	copyright: string;
	gamePk: number;
	link: string;
	metaData: MetaData;
	gameData: GameData;
	liveData: LiveData;
}

export interface MetaData {
	wait: number;
	timeStamp: string;
	gameEvents: string[];
	logicalEvents: string[];
}

export interface GameData {
	game: Game;
	datetime: Datetime;
	status: Status;
	teams: GameDataTeams;
	players: GameDataPlayerDict;
	venue: GameVenue;
	officialVenue: BaseObject;
	weather: Weather;
	gameInfo: GameInfo;
	review: Review;
	flags: Flags;
	alerts: any[];
	probablePitchers: ProbablePitchers;
	officialScorer: FullNamedObject;
	primaryDatacaster: FullNamedObject;
	moundVisits: MoundVisits;
}

export interface Game {
	pk: number;
	type: string;
	doubleHeader: string;
	id: string;
	gamedayType: string;
	tiebreaker: string;
	gameNumber: number;
	calendarEventID: string;
	season: string;
	seasonDisplay: string;
}

export interface Datetime {
	dateTime: string;
	originalDate: string;
	officialDate: string;
	dayNight: string;
	time: string;
	ampm: string;
}

export interface Status {
	abstractGameState: string;
	codedGameState: string;
	detailedState: string;
	statusCode: string;
	startTimeTBD: boolean;
	abstractGameCode: string;
}

export interface GameDataTeams {
	away: GameDataTeam;
	home: GameDataTeam;
}

export interface GameDataTeam {
	springLeague: SpringLeague;
	allStarStatus: string;
	id: number;
	name: string;
	link: string;
	season: number;
	venue: NamedObject;
	springVenue: BaseObject;
	teamCode: string;
	fileCode: string;
	abbreviation: string;
	teamName: string;
	locationName: string;
	firstYearOfPlay: string;
	league: NamedObject;
	division: NamedObject;
	sport: NamedObject;
	shortName: string;
	record: Record;
	franchiseName: string;
	clubName: string;
	active: boolean;
}

export interface SpringLeague {
	id: number;
	name: string;
	link: string;
	abbreviation: string;
}

export interface BaseObject {
	id: number;
	link: string;
}

export interface NamedObject extends BaseObject {
	name: string;
}

export interface FullNamedObject extends BaseObject {
	fullName: string;
}

export interface Record {
	gamesPlayed: number;
	wildCardGamesBack: string;
	leagueGamesBack: string;
	springLeagueGamesBack: string;
	sportGamesBack: string;
	divisionGamesBack: string;
	conferenceGamesBack: string;
	leagueRecord: LeagueRecord;
	records: Records;
	divisionLeader: boolean;
	wins: number;
	losses: number;
	winningPercentage: string;
}

export interface LeagueRecord {
	wins: number;
	losses: number;
	ties: number;
	pct: string;
}

export interface Records {}

export interface GameDataPlayerDict {
	[id: string]: PlayerObject;
}

export interface PlayerObject {
	id: number;
	fullName: string;
	link: string;
	firstName: string;
	lastName: string;
	primaryNumber: string;
	birthDate: string;
	currentAge: number;
	birthCity: string;
	birthStateProvince?: string;
	birthCountry: string;
	height: string;
	weight: number;
	active: boolean;
	primaryPosition: Position;
	useName: string;
	useLastName: string;
	middleName: string;
	boxscoreName: string;
	nickName?: string;
	gender: string;
	nameMatrilineal?: string;
	isPlayer: boolean;
	isVerified: boolean;
	draftYear: number;
	pronunciation?: string;
	mlbDebutDate: string;
	batSide: CodeDescription;
	pitchHand: CodeDescription;
	nameFirstLast: string;
	nameSlug: string;
	firstLastName: string;
	lastFirstName: string;
	lastInitName: string;
	initLastName: string;
	fullFMLName: string;
	fullLFMName: string;
	strikeZoneTop: number;
	strikeZoneBottom: number;
}

export interface CodeDescription {
	code: string;
	description: string;
}

export interface GameVenue {
	id: number;
	name: string;
	link: string;
	location: Location;
	timeZone: TimeZone;
	fieldInfo: FieldInfo;
	active: boolean;
	season: string;
}

export interface Location {
	address1: string;
	city: string;
	state: string;
	stateAbbrev: string;
	postalCode: string;
	defaultCoordinates: Coordinates;
	azimuthAngle: number;
	elevation: number;
	country: string;
	phone: string;
}

export interface Coordinates {
	latitude: number;
	longitude: number;
}

export interface TimeZone {
	id: string;
	offset: number;
	offsetAtGameTime: number;
	tz: string;
}

export interface FieldInfo {
	capacity: number;
	turfType: string;
	roofType: string;
	leftLine: number;
	leftCenter: number;
	center: number;
	rightCenter: number;
	rightLine: number;
}

export interface Weather {
	condition: string;
	temp: string;
	wind: string;
}

export interface GameInfo {
	attendance: number;
	firstPitch: string;
	gameDurationMinutes: number;
}

export interface Review {
	hasChallenges: boolean;
	away: Counter;
	home: Counter;
}

export interface Counter {
	used: number;
	remaining: number;
}

export interface Flags {
	noHitter: boolean;
	perfectGame: boolean;
	awayTeamNoHitter: boolean;
	awayTeamPerfectGame: boolean;
	homeTeamNoHitter: boolean;
	homeTeamPerfectGame: boolean;
}

export interface ProbablePitchers {
	away: FullNamedObject;
	home: FullNamedObject;
}

export interface MoundVisits {
	away: Counter;
	home: Counter;
}

export interface LiveData {
	plays: Plays;
	linescore: Linescore;
	boxscore: Boxscore;
	decisions: Decisions;
	leaders: Leaders;
}

export interface Plays {
	allPlays: Play[];
	currentPlay: Play;
	scoringPlays: number[];
	playsByInning: PlaysByInning[];
}

export interface Play {
	result: PlayResult;
	about: About;
	count: PitchCount;
	matchup: Matchup;
	pitchIndex: number[];
	actionIndex: number[];
	runnerIndex: number[];
	runners: Runner[];
	playEvents: PlayEvent[];
	playEndTime: string;
	atBatIndex: number;
	reviewDetails?: ReviewDetails;
}

export interface PlayResult {
	type: string;
	event: string;
	eventType: string;
	description: string;
	rbi: number;
	awayScore: number;
	homeScore: number;
	isOut: boolean;
}

export interface About {
	atBatIndex: number;
	halfInning: string;
	isTopInning: boolean;
	inning: number;
	startTime: string;
	endTime: string;
	isComplete: boolean;
	isScoringPlay: boolean;
	hasReview: boolean;
	hasOut: boolean;
	captivatingIndex: number;
}

export interface PitchCount {
	balls: number;
	strikes: number;
	outs: number;
}

export interface Matchup {
	batter: FullNamedObject;
	batSide: CodeDescription;
	pitcher: FullNamedObject;
	pitchHand: CodeDescription;
	batterHotColdZones: BatterHotColdZone[];
	pitcherHotColdZones: any[];
	splits: Splits;
	postOnFirst?: FullNamedObject;
	postOnSecond?: FullNamedObject;
	postOnThird?: FullNamedObject;
	batterHotColdZoneStats?: BatterHotColdZoneStats;
}

export interface BatterHotColdZone {
	zone: string;
	color: string;
	temp: string;
	value: string;
}

export interface Splits {
	batter: string;
	pitcher: string;
	menOnBase: string;
}

export interface BatterHotColdZoneStats {
	stats: Stat[];
}

export interface Stat {
	type: Name;
	group: Name;
	exemptions: any[];
	splits: Split[];
}

export interface Name {
	displayName: string;
}

export interface Split {
	stat: SplitStat;
}

export interface SplitStat {
	name: string;
	zones: Zone[];
}

export interface Zone {
	zone: string;
	color: string;
	temp: string;
	value: string;
}

export interface Runner {
	movement: Movement;
	details: RunnerDetails;
	credits: Credit[];
}

export interface Movement {
	originBase?: string;
	start?: string;
	end?: string;
	outBase?: string;
	isOut: boolean;
	outNumber?: number;
}

export interface RunnerDetails {
	event: string;
	eventType: string;
	movementReason?: string;
	runner: FullNamedObject;
	responsiblePitcher?: BaseObject;
	isScoringEvent: boolean;
	rbi: boolean;
	earned: boolean;
	teamUnearned: boolean;
	playIndex: number;
}

export interface Credit {
	player: BaseObject;
	position: Position;
	credit: string;
}

export interface Position {
	code: string;
	name: string;
	type: string;
	abbreviation: string;
}

export interface PlayEvent {
	details: PlayDetails;
	count: PitchCount;
	pitchData?: PitchData;
	hitData?: HitData;
	index: number;
	playId?: string;
	pitchNumber?: number;
	startTime: string;
	endTime: string;
	isPitch: boolean;
	type: string;
	player?: BaseObject;
	actionPlayId?: string;
	isBaseRunningPlay?: boolean;
	isSubstitution?: boolean;
	position?: Position;
	reviewDetails?: ReviewDetails;
	battingOrder?: string;
	replacedPlayer?: BaseObject;
	base?: number;
}

export interface PlayDetails {
	call?: CodeDescription;
	description: string;
	code?: string;
	ballColor?: string;
	trailColor?: string;
	isInPlay?: boolean;
	isStrike?: boolean;
	isBall?: boolean;
	type?: CodeDescription;
	isOut: boolean;
	hasReview: boolean;
	event?: string;
	eventType?: string;
	awayScore?: number;
	homeScore?: number;
	isScoringPlay?: boolean;
	fromCatcher?: boolean;
	disengagementNum?: number;
	runnerGoing?: boolean;
}

export interface PitchData {
	startSpeed: number;
	endSpeed: number;
	strikeZoneTop: number;
	strikeZoneBottom: number;
	coordinates: PitchCoords;
	breaks: Breaks;
	zone: number;
	typeConfidence: number;
	plateTime: number;
	extension: number;
}

export interface PitchCoords {
	aY: number;
	aZ: number;
	pfxX: number;
	pfxZ: number;
	pX: number;
	pZ: number;
	vX0: number;
	vY0: number;
	vZ0: number;
	x: number;
	y: number;
	x0: number;
	y0: number;
	z0: number;
	aX: number;
}

export interface Breaks {
	breakAngle: number;
	breakLength: number;
	breakY: number;
	breakVertical: number;
	breakVerticalInduced: number;
	breakHorizontal: number;
	spinRate: number;
	spinDirection: number;
}

export interface HitData {
	trajectory: string;
	hardness: string;
	location: string;
	coordinates: XYCoords;
	launchSpeed?: number;
	launchAngle?: number;
	totalDistance?: number;
}

export interface XYCoords {
	coordX: number;
	coordY: number;
}

export interface ReviewDetails {
	isOverturned: boolean;
	inProgress: boolean;
	reviewType: string;
	challengeTeamId: number;
}

export interface PlaysByInning {
	startIndex: number;
	endIndex: number;
	top: number[];
	bottom: number[];
	hits: Hits;
}

export interface Hits {
	away: TeamHits[];
	home: TeamHits[];
}

export interface TeamHits {
	team: Team;
	inning: number;
	pitcher: FullNamedObject;
	batter: FullNamedObject;
	coordinates: XYCoords;
	type: string;
	description: string;
}

export interface Team {
	springLeague: SpringLeague;
	allStarStatus: string;
	id: number;
	name: string;
	link: string;
}

export interface Linescore {
	note: string;
	currentInning: number;
	currentInningOrdinal: string;
	inningState: string;
	inningHalf: string;
	isTopInning: boolean;
	scheduledInnings: number;
	innings: Inning[];
	teams: LineScoreTeam;
	defense: Defense;
	offense: Offense;
	balls: number;
	strikes: number;
	outs: number;
}

export interface Inning {
	num: number;
	ordinalNum: string;
	home: TeamInningStats;
	away: TeamInningStats;
}

export interface TeamInningStats {
	runs: number;
	hits: number;
	errors: number;
	leftOnBase: number;
}

export interface LineScoreTeam {
	home: TeamInningStats;
	away: TeamInningStats;
}

export interface Defense {
	pitcher: FullNamedObject;
	catcher: FullNamedObject;
	first: FullNamedObject;
	second: FullNamedObject;
	third: FullNamedObject;
	shortstop: FullNamedObject;
	left: FullNamedObject;
	center: FullNamedObject;
	right: FullNamedObject;
	batter: FullNamedObject;
	onDeck: FullNamedObject;
	inHole: FullNamedObject;
	battingOrder: number;
	team: NamedObject;
}

export interface Offense {
	batter: FullNamedObject;
	onDeck: FullNamedObject;
	inHole: FullNamedObject;
	first: FullNamedObject;
	pitcher: FullNamedObject;
	battingOrder: number;
	team: NamedObject;
}

export interface Boxscore {
	teams: BoxScoreTeams;
	officials: Official[];
	info: LabeledItem[];
	pitchingNotes: any[];
	topPerformers: TopPerformer[];
}

export interface BoxScoreTeams {
	away: BoxScoreTeam;
	home: BoxScoreTeam;
}

export interface BoxScoreTeam {
	team: Team;
	teamStats: TeamStats;
	players: BoxScorePlayers;
	batters: number[];
	pitchers: number[];
	bench: number[];
	bullpen: number[];
	battingOrder: number[];
	info: Info[];
	note: LabeledItem[];
}

export interface TeamStats {
	batting: TeamBattingStats;
	pitching: TeamPitchingStats;
	fielding: TeamFieldingStats;
}

export interface TeamBattingStats {
	flyOuts: number;
	groundOuts: number;
	airOuts: number;
	runs: number;
	doubles: number;
	triples: number;
	homeRuns: number;
	strikeOuts: number;
	baseOnBalls: number;
	intentionalWalks: number;
	hits: number;
	hitByPitch: number;
	avg: string;
	atBats: number;
	obp: string;
	slg: string;
	ops: string;
	caughtStealing: number;
	stolenBases: number;
	stolenBasePercentage: string;
	groundIntoDoublePlay: number;
	groundIntoTriplePlay: number;
	plateAppearances: number;
	totalBases: number;
	rbi: number;
	leftOnBase: number;
	sacBunts: number;
	sacFlies: number;
	catchersInterference: number;
	pickoffs: number;
	atBatsPerHomeRun: string;
	popOuts: number;
	lineOuts: number;
}

export interface TeamPitchingStats {
	flyOuts: number;
	groundOuts: number;
	airOuts: number;
	runs: number;
	doubles: number;
	triples: number;
	homeRuns: number;
	strikeOuts: number;
	baseOnBalls: number;
	intentionalWalks: number;
	hits: number;
	hitByPitch: number;
	atBats: number;
	obp: string;
	caughtStealing: number;
	stolenBases: number;
	stolenBasePercentage: string;
	numberOfPitches: number;
	era: string;
	inningsPitched: string;
	saveOpportunities: number;
	earnedRuns: number;
	whip: string;
	battersFaced: number;
	outs: number;
	completeGames: number;
	shutouts: number;
	pitchesThrown: number;
	balls: number;
	strikes: number;
	strikePercentage: string;
	hitBatsmen: number;
	balks: number;
	wildPitches: number;
	pickoffs: number;
	groundOutsToAirouts: string;
	rbi: number;
	pitchesPerInning: string;
	runsScoredPer9: string;
	homeRunsPer9: string;
	inheritedRunners: number;
	inheritedRunnersScored: number;
	catchersInterference: number;
	sacBunts: number;
	sacFlies: number;
	passedBall: number;
	popOuts: number;
	lineOuts: number;
}

export interface TeamFieldingStats {
	caughtStealing: number;
	stolenBases: number;
	stolenBasePercentage: string;
	assists: number;
	putOuts: number;
	errors: number;
	chances: number;
	passedBall: number;
	pickoffs: number;
}

export interface BoxScorePlayers {
	[id: string]: BoxScorePlayer;
}

export interface BoxScorePlayer {
	person: Person;
	jerseyNumber: string;
	position: Position;
	status: CodeDescription;
	parentTeamId: number;
	battingOrder?: string;
	stats: BoxScorePlayerStats;
	seasonStats: SeasonStats;
	gameStatus: GameStatus;
	allPositions?: Position[];
}

export interface Person {
	id: number;
	fullName: string;
	link: string;
}

export interface BoxScorePlayerStats {
	batting: PlayerGameBattingStats;
	pitching: PlayerGamePitchingStats;
	fielding: PlayerGameFieldingStats;
}

export interface PlayerGamePitchingStats {}

// Empty for some reason?
export interface PlayerGameBattingStats {
	summary: string;
	gamesPlayed: number;
	flyOuts: number;
	groundOuts: number;
	airOuts: number;
	runs: number;
	doubles: number;
	triples: number;
	homeRuns: number;
	strikeOuts: number;
	baseOnBalls: number;
	intentionalWalks: number;
	hits: number;
	hitByPitch: number;
	atBats: number;
	caughtStealing: number;
	stolenBases: number;
	stolenBasePercentage: string;
	groundIntoDoublePlay: number;
	groundIntoTriplePlay: number;
	plateAppearances: number;
	totalBases: number;
	rbi: number;
	leftOnBase: number;
	sacBunts: number;
	sacFlies: number;
	catchersInterference: number;
	pickoffs: number;
	atBatsPerHomeRun: string;
	popOuts: number;
	lineOuts: number;
}

export interface PlayerGameFieldingStats {
	gamesStarted: number;
	caughtStealing: number;
	stolenBases: number;
	stolenBasePercentage: string;
	assists: number;
	putOuts: number;
	errors: number;
	chances: number;
	fielding: string;
	passedBall: number;
	pickoffs: number;
}

export interface SeasonStats {
	batting: SeasonBattingStats;
	pitching: SeasonPitchingStats;
	fielding: SeasonFieldingStats;
}

export interface SeasonBattingStats {
	gamesPlayed: number;
	flyOuts: number;
	groundOuts: number;
	airOuts: number;
	runs: number;
	doubles: number;
	triples: number;
	homeRuns: number;
	strikeOuts: number;
	baseOnBalls: number;
	intentionalWalks: number;
	hits: number;
	hitByPitch: number;
	avg: string;
	atBats: number;
	obp: string;
	slg: string;
	ops: string;
	caughtStealing: number;
	stolenBases: number;
	stolenBasePercentage: string;
	groundIntoDoublePlay: number;
	groundIntoTriplePlay: number;
	plateAppearances: number;
	totalBases: number;
	rbi: number;
	leftOnBase: number;
	sacBunts: number;
	sacFlies: number;
	babip: string;
	groundOutsToAirouts: string;
	catchersInterference: number;
	pickoffs: number;
	atBatsPerHomeRun: string;
	popOuts: number;
	lineOuts: number;
}

export interface SeasonPitchingStats {
	gamesPlayed: number;
	gamesStarted: number;
	flyOuts: number;
	groundOuts: number;
	airOuts: number;
	runs: number;
	doubles: number;
	triples: number;
	homeRuns: number;
	strikeOuts: number;
	baseOnBalls: number;
	intentionalWalks: number;
	hits: number;
	hitByPitch: number;
	atBats: number;
	obp: string;
	caughtStealing: number;
	stolenBases: number;
	stolenBasePercentage: string;
	numberOfPitches: number;
	era: string;
	inningsPitched: string;
	wins: number;
	losses: number;
	saves: number;
	saveOpportunities: number;
	holds: number;
	blownSaves: number;
	earnedRuns: number;
	whip: string;
	battersFaced: number;
	outs: number;
	gamesPitched: number;
	completeGames: number;
	shutouts: number;
	balls: number;
	strikes: number;
	strikePercentage: string;
	hitBatsmen: number;
	balks: number;
	wildPitches: number;
	pickoffs: number;
	groundOutsToAirouts: string;
	rbi: number;
	winPercentage: string;
	pitchesPerInning: string;
	gamesFinished: number;
	strikeoutWalkRatio: string;
	strikeoutsPer9Inn: string;
	walksPer9Inn: string;
	hitsPer9Inn: string;
	runsScoredPer9: string;
	homeRunsPer9: string;
	inheritedRunners: number;
	inheritedRunnersScored: number;
	catchersInterference: number;
	sacBunts: number;
	sacFlies: number;
	passedBall: number;
	popOuts: number;
	lineOuts: number;
}

export interface SeasonFieldingStats {
	gamesStarted: number;
	caughtStealing: number;
	stolenBases: number;
	stolenBasePercentage: string;
	assists: number;
	putOuts: number;
	errors: number;
	chances: number;
	fielding: string;
	passedBall: number;
	pickoffs: number;
}

export interface GameStatus {
	isCurrentBatter: boolean;
	isCurrentPitcher: boolean;
	isOnBench: boolean;
	isSubstitute: boolean;
}

export interface Info {
	title: string;
	fieldList: LabeledItem[];
}
export interface LabeledItem {
	label: string;
	value?: string;
}

export interface Official {
	official: Person;
	officialType: string;
}

export interface Person {
	id: number;
	fullName: string;
	link: string;
}

export interface TopPerformer {
	player: TopPerformerPlayer;
	type: string;
	gameScore: number;
	hittingGameScore: number;
}

export interface TopPerformerPlayer {
	person: TopPerformerPerson;
	jerseyNumber: string;
	position: Position;
	status: CodeDescription;
	parentTeamId: number;
	battingOrder: string;
	stats: Stats;
	seasonStats: SeasonStats;
	gameStatus: GameStatus;
	allPositions: Position[];
}

export interface TopPerformerPerson {
	id: number;
	fullName: string;
	link: string;
	boxscoreName: string;
}

export interface Decisions {
	winner: FullNamedObject;
	loser: FullNamedObject;
}

export interface Leaders {
	hitDistance: HitDistance;
	hitSpeed: HitSpeed;
	pitchSpeed: PitchSpeed;
}

export interface HitDistance {}

export interface HitSpeed {}

export interface PitchSpeed {}
