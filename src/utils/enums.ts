export enum ThemeName {
    light = 'light',
    dark = 'dark',
}

export enum ScreenWidthBreakpoints {
    extraLarge = 1248,
    large = 1024,
    medium = 768,
    small = 375,
}

export enum Alignments {
    center = 'center',
    left = 'left',
    right = 'right',
}

export enum LanguageCode {
    Czech = 'cs',
    English = 'en',
    Finnish = 'fi',
    French = 'fr',
    German = 'de',
    Russian = 'ru',
    Slovak = 'sk',
    Spanish = 'es',
    Swedish = 'sv',
}

export enum CountryCode {
    Canada = 'CA',
    Liberia = 'LR',
    Myanmar = 'MM',
    None = '',
    UnitedKingdom = 'UK',
    UnitedStates = 'US',
}

export enum CountryName {
    CA = 'Canada',
    US = 'United States',
}

export enum BroadcastMarket {
    home = 'H',
    national = 'N',
    away = 'A',
}

export enum GameLocation {
    home = 'H',
    road = 'R',
}

export enum GameType {
    preseason = 1,
    regularSeason = 2,
    playoffs = 3,
    allStarGame = 4,
}

export enum ConferenceAbbrev {
    western = 'W',
    eastern = 'E'
}

export enum DivisionAbbrev {
    atlantic = 'A',
    central = 'C',
    metro = 'M',
    pacific = 'P',
}

export enum EventTypeCode {
    goal = 505,
    penalty = 509,
    periodStart = 520,
    periodEnd = 521,
    gameEnd = 524 
}

export enum GameState {
    future = 'FUT',
    pregame = 'PRE',
    softFinal = 'OVER',
    hardFinal = 'FINAL',
    official = 'OFF',
    live = 'LIVE',
    critical = 'CRIT',
}

export enum GameScheduleState {
    scheduled = 'OK',
    toBeDetermined = 'TBD',
    postponed = 'PPD',
    suspended = 'SUSP',
    cancelled = 'CNCL',
}

export enum PeriodType {
    regulation = 'REG',
    overtime = 'OT',
    shootout = 'SO',
}

export enum SituationCode {
    emptyNet = 'EN',
    powerPlay = 'PP',
}

export enum PlayoffRoundCode {
    conferenceFinals = 'CF',
    conferenceQuarterFinals = 'CQF',
    conferenceSemiFinals = 'CSF',
    divisionFinals = 'DF',
    divisionSemiFinals = 'DSF',
    final = 'F',
    nhlFinal = 'NHLF',
    nhlSemiFinal = 'NHLSF',
    preliminaryRound = 'PRLM',
    quarterFinals = 'QF',
    roundOne = 'R1',
    roundTwo = 'R2',
    stanleyCupFinal = 'SCF',
    stanleyCupQualifiers = 'SCQ',
    stanleyCupSemiFinal = 'SCSF',
    semiFinals = 'SF',
}

export enum PlayerPosition {
    leftWing = 'L',
    rightWing = 'R',
    center = 'C',
    forward = 'F',
    defensemen = 'D',
    goalie = 'G',
}

export enum PlayerStatAbbrev {
    gamesPlayed = 'GP',
    goals = 'G',
    goalsAgainstPerGamesPlayed = 'GA/GP',
    goalsForPerGamesPlayed = 'GF/GP',
    assists = 'A',
    points = 'P',
    plusMinus = '+/-',
    penaltyMinutes = 'PIM',
    powerPlayGoals = 'PPG',
    powerPlayPercentage = 'PP%',
    powerPlayPoints = 'PPP',
    shortHandedGoals = 'SHG',
    shortHandedPoints = 'SHP',
    gameWinningGoals = 'GWG',
    overtimeGoals = 'OTG',
    shots = 'S',
    shootingPctg = 'S%',
    timeOnIce = 'TOI',
    avgTimeOnIce = 'AVG TOI',
    shifts = 'SFT',
    shiftsPerGame = 'SFT/G',
    faceoffPctg = 'FO%',
    gamesStarted = 'GS',
    wins = 'W',
    losses = 'L',
    ties = 'T',
    overtimeLossesAbbrev = 'O',
    overtimeLosses = 'OTL',
    goalsAgainstAvg = 'GAA',
    record = 'record',
    savePctg = 'SV%',
    shotsAgainst = 'SA',
    saves = 'SV',
    goalsAgainst = 'GA',
    shutouts = 'SO',
    hits = 'H',
    shotsBlocked = 'SB',
    blocks = 'BLKS',
    shotsOnGoal = 'SOG',
    giveaways = 'GVA',
    takeaways = 'TK',
    evenStrengthShotsAgainst = 'EV',
    powerPlayShotsAgainst = 'PP',
    shorthandedShotsAgainst = 'SH',
    decision = 'DEC',
}

export enum PlayerStatNames {
    assists = 'assists',
    blockedShots = 'blockedShots',
    goals = 'goals',
    goalsAgainstAvg = 'goalsAgainstAverage',
    faceoffPctg = 'faceoffPctg',
    faceoffWinningPctg = 'faceoffWinningPctg',
    giveaways = 'giveaways',
    penaltyKillPctg = 'penaltyKillPctg',
    penaltyMinutes = 'penaltyMinutes',
    plusMinus = 'plusMinus',
    points = 'points',
    powerPlay = 'powerPlay',
    powerPlayPctg = 'powerPlayPctg',
    record = 'record',
    savePctg = 'savePctg',
    shotsOnGoal = 'shotsOnGoal',
    takeaways = 'takeaways',
    wins = 'wins',
}

export enum LeagueNames {
    nhl = 'NHL',
    allLeagues = 'All Leagues',
}

export enum TeamTriCode {
    ANA = 'ANA',
    ARI = 'ARI',
    BOS = 'BOS',
    BUF = 'BUF',
    CGY = 'CGY',
    CAR = 'CAR',
    CHI = 'CHI',
    COL = 'COL',
    CBJ = 'CBJ',
    DAL = 'DAL',
    DET = 'DET',
    EDM = 'EDM',
    FLA = 'FLA',
    LAK = 'LAK',
    MIN = 'MIN',
    MTL = 'MTL',
    NSH = 'NSH',
    NJD = 'NJD',
    NYI = 'NYI',
    NYR = 'NYR',
    OTT = 'OTT',
    PHI = 'PHI',
    PIT = 'PIT',
    SEA = 'SEA',
    SJS = 'SJS',
    STL = 'STL',
    TBL = 'TBL',
    TOR = 'TOR',
    VAN = 'VAN',
    VGK = 'VGK',
    WPG = 'WPG',
    WSH = 'WSH',
}

export enum PlayerGoalModifier {
    AWARDED = 'awarded',
    AWARDED_EMPTY_NET = 'awarded-empty-net',
    EMPTY_NET = 'empty-net',
    GAME_WINNING_GOAL = 'game-winning-goal',
    NONE = 'none',
    OWN_GOAL = 'own-goal',
    OWN_GOAL_EMPTY_NET = 'own-goal-empty-net',
    PENALTY_SHOT = 'penalty-shot',
}

export enum PenaltyType {
    PS_COVERING_PUCK_IN_CREASE = "ps-covering-puck-in-crease",
    PS_GOALKEEPER_DISPLACED_NET = "ps-goalkeeper-displaced-net",
    PS_HOLDING_ON_BREAKAWAY = "ps-holding-on-breakaway",
    PS_HOOKING_ON_BREAKAWAY = "ps-hooking-on-breakaway",
    PS_NET_DISPLACED = "ps-net-displaced",
    PS_SLASH_ON_BREAKAWAY = "ps-slash-on-breakaway",
    PS_THROWING_OBJECT_AT_PUCK = "ps-throwing-object-at-puck",
    PS_TRIPPING_ON_BREAKAWAY = "ps-tripping-on-breakaway",
    ABUSE_OF_OFFICIALS = "abuse-of-officials",
    BENCH = "bench",
    BOARDING = "boarding",
    BROKEN_STICK = "broken-stick",
    CHARGING = "charging",
    CLIPPING = "clipping",
    CLOSING_HAND_ON_PUCK = "closing-hand-on-puck",
    CROSS_CHECKING = "cross-checking",
    DELAYING_GAME = "delaying-game",
    DELAYING_GAME_BENCH = "delaying-game-bench",
    DELAYING_GAME_BENCH_FACE_OFF_VIOLATION = "delaying-game-bench-face-off-violation",
    DELAYING_GAME_EQUIPMENT = "delaying-game-equipment",
    DELAYING_GAME_FACE_OFF_VIOLATION = "delaying-game-face-off-violation",
    DELAYING_GAME_PUCK_OVER_GLASS = "delaying-game-puck-over-glass",
    DELAYING_GAME_SMOTHERING_PUCK = "delaying-game-smothering-puck",
    DELAYING_GAME_UNSUCCESSFUL_CHALLENGE = "delaying-game-unsuccessful-challenge",
    ELBOWING = "elbowing",
    EMBELLISHMENT = "embellishment",
    GOALIE_LEAVE_CREASE = "goalie-leave-crease",
    GOALIE_PARTICIPATION_BEYOND_CENTER = "goalie-participation-beyond-center",
    HIGH_STICKING = "high-sticking",
    HOLDING = "holding",
    HOLDING_THE_STICK = "holding-the-stick",
    HOOKING = "hooking",
    ILLEGAL_CHECK_TO_HEAD = "illegal-check-to-head",
    ILLEGAL_STICK = "illegal-stick",
    INSTIGATOR = "instigator",
    INTERFERENCE = "interference",
    INTERFERENCE_BENCH = "interference-bench",
    INTERFERENCE_GOALKEEPER = "interference-goalkeeper",
    KNEEING = "kneeing",
    PLAYING_WITHOUT_A_HELMET = "playing-without-a-helmet",
    PUCK_THROWN_FORWARD_GOALKEEPER = "puck-thrown-forward-goalkeeper",
    ROUGHING = "roughing",
    ROUGHING_REMOVING_OPPONENTS_HELMET = "roughing-removing-opponents-helmet",
    SLASHING = "slashing",
    THROWING_EQUIPMENT = "throwing-equipment",
    TOO_MANY_MEN_ON_THE_ICE = "too-many-men-on-the-ice",
    TRIPPING = "tripping",
    UNSPORTSMANLIKE_CONDUCT = "unsportsmanlike-conduct",
    UNSPORTSMANLIKE_CONDUCT_BENCH = "unsportsmanlike-conduct-bench",
    HIGH_STICKING_DOUBLE_MINOR = "high-sticking-double-minor",
    SPEARING_DOUBLE_MINOR = "spearing-double-minor",
    CHECKING_FROM_BEHIND = "checking-from-behind",
    FIGHTING = "fighting",
    SPEARING = "spearing",
    ABUSIVE_LANGUAGE = "abusive-language",
    AGGRESSOR = "aggressor",
    GAME_MISCONDUCT = "game-misconduct",
    INSTIGATOR_MISCONDUCT = "instigator-misconduct",
    MISCONDUCT = "misconduct",
    MATCH_PENALTY = "match-penalty"
}

export enum CookieName {
    SITE_PREFERENCES = 'nhl_site_preferences',
}
