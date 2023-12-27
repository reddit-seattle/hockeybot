import { LocalizedString } from "./Common";

  export interface DraftDetails {
    year: number;
    teamAbbrev: string;
    round: number;
    pickInRound: number;
    overallPick: number;
  }

    //featured stats.regularseason.subseason
  export interface SubSeason {
    gamesPlayed: number;
    // player stats
    goals?: number;
    assists?: number;
    points?: number;
    plusMinus?: number;
    pim: number;
    gameWinningGoals?: number;
    otGoals?: number;
    shots?: number;
    shootingPctg?: number;
    powerPlayGoals: number;
    powerPlayPoints: number;
    shorthandedGoals: number;
    shorthandedPoints: number;

    // goalie stats
    wins?: number;
    losses?: number;
    ties?: number;
    otLosses?: number;
    shutouts?: number;
    goalsAgainstAvg?: number;
    savePctg?: number;
  }

  //featured stats.regularseason.career
  export interface Career {
    gamesPlayed: number;

    // player stats
    goals?: number
    assists?: number
    points?: number
    plusMinus?: number
    pim?: number
    gameWinningGoals?: number
    otGoals?: number
    shots?: number
    shootingPctg?: number
    powerPlayGoals?: number
    powerPlayPoints?: number
    shorthandedGoals?: number
    shorthandedPoints?: number

    // goalie stats
    wins?: number;
    losses?: number;
    otLosses?: number;
    shutouts?: number;
    goalsAgainstAvg?: number;
    savePctg?: number;
  }
  export interface RegularSeason {
    subSeason: SubSeason;
    career: Career;
  }
  export interface FeaturedStats {
    season: number;
    regularSeason: RegularSeason;
  }

  // careerTotals.regularSeason / careerTotals.playoffs

  export interface CareerStats {
    gamesPlayed: number;
    goals: number;
    assists: number;
    pim: number;

    // player stats
    points?: number;
    plusMinus?: number;
    powerPlayGoals?: number;
    powerPlayPoints?: number;
    shorthandedPoints?: number;
    gameWinningGoals?: number;
    otGoals?: number;
    shots?: number;
    shootingPctg?: number;
    faceoffWinningPctg?: number;
    avgToi?: string;
    shorthandedGoals?: number;

    // goalie stats
    gamesStarted?: number;
    wins?: number;
    losses?: number;
    otLosses?: number;
    shotsAgainst?: number;
    goalsAgainst?: number;
    goalsAgainstAvg?: number;
    savePctg?: number;
    shutouts?: number;
    timeOnIce?: string;
  }
  export interface CareerTotals {
    regularSeason: CareerStats;
    playoffs: CareerStats;
  }
  export interface Last5Game {
    gameId: number;
    gameTypeId: number;
    teamAbbrev: string;
    homeRoadFlag: string;
    gameDate: string;
    opponentAbbrev: string;
    toi: string;

    // player stuff
    goals?: number;
    assists?: number;
    points?: number;
    plusMinus?: number;
    powerPlayGoals?: number;
    shots?: number;
    shifts?: number;
    pim?: number;
    shorthandedGoals?: number;

    // goalie stuff
    gamesStarted?: number;
    shotsAgainst?: number;
    goalsAgainst?: number;
    savePctg?: number;
    penaltyMins?: number;
    decision?: string;
  }

  export interface SeasonTotal {
    season: number;
    gameTypeId: number;
    leagueAbbrev: string;
    teamName: LocalizedString;
    sequence: number;
    gamesPlayed: number;
    savePctg?: number;
    goalsAgainstAvg?: number;
    goalsAgainst?: number;
    timeOnIce?: string;
    wins?: number;
    losses?: number;
    shotsAgainst?: number;
    ties?: number;
    goals?: number;
    assists?: number;
    gamesStarted?: number;
    otLosses?: number;
    shutouts?: number;
    pim?: number;
  }
  export interface Season {
    seasonId: number;
    gamesPlayed: number;
    gameTypeId: number;
    wins: number;
    losses: number;
    savePctg: number;
    gaa: number;
  }
  export interface Award {
    trophy: LocalizedString;
    seasons: Season[];
  }
  export interface CurrentTeamRoster {
    playerId: number;
    lastName: LocalizedString;
    firstName: LocalizedString;
    playerSlug: string;
  }
  export interface PlayerStatsSummary {
    playerId: number;
    isActive: boolean;
    currentTeamId: number;
    currentTeamAbbrev: string;
    fullTeamName: LocalizedString;
    firstName: LocalizedString;
    lastName: LocalizedString;
    teamLogo: string;
    sweaterNumber: number;
    position: string;
    headshot: string;
    heroImage: string;
    heightInInches: number;
    heightInCentimeters: number;
    weightInPounds: number;
    weightInKilograms: number;
    birthDate: string;
    birthCity: LocalizedString;
    birthCountry: string;
    shootsCatches: string;
    draftDetails: DraftDetails;
    playerSlug: string;
    inTop100AllTime: number;
    inHHOF: number;
    featuredStats: FeaturedStats;
    careerTotals: CareerTotals;
    shopLink: string;
    twitterLink: string;
    watchLink: string;
    last5Games: Last5Game[];
    // may have to add goalie/skater optional fields
    seasonTotals: SeasonTotal[];
    awards: Award[];
    currentTeamRoster: CurrentTeamRoster[];
  }