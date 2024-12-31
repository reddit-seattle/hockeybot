import { LocalizedString } from "./Common";

/** TODO
 * Consolidate all endpoint "player"-like objects into extension classes and one typings file.
 * Repeat for other similar objects (roster, game, event types [goal, penalty])
 */
interface TvBroadcast {
  id: string;
  market: string;
  countryCode: string;
  network: string;
}
export interface PeriodDescriptor {
  number: number;
  periodType: string;
}
export interface Team {
  id: string;
  commonName: LocalizedString;
  abbrev: string;
  score: number;
  sog: number;
  logo: string;
  onIce: any[];
  placeName: LocalizedString;
}
interface Clock {
  timeRemaining: string;
  secondsRemaining: number;
  running: boolean;
  inIntermission: boolean;
}
interface GameOutcome {
  lastPeriodType: string;
}
export interface Details {
  eventOwnerTeamId?: string;
  losingPlayerId?: string;
  winningPlayerId?: string;
  xCoord?: number;
  yCoord?: number;
  zoneCode?: string;
  reason?: string;
  hittingPlayerId?: string;
  hitteePlayerId?: string;
  playerId?: string;
  shotType?: string;
  shootingPlayerId?: string;
  goalieInNetId?: string;
  awaySOG?: number;
  homeSOG?: number;
  blockingPlayerId?: string;
  scoringPlayerId?: string;
  scoringPlayerTotal?: number;
  assist1PlayerId?: string;
  assist1PlayerTotal?: number;
  assist2PlayerId?: string;
  assist2PlayerTotal?: number;
  awayScore?: number;
  homeScore?: number;
  secondaryReason?: string;
  typeCode?: string;
  descKey?: string;
  duration?: number;
  committedByPlayerId?: string;
  servedByPlayerId?: string;
  drawnByPlayerId?: string;
}
export interface Play {
  eventId: string;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  timeRemaining: string;
  situationCode?: string;
  homeTeamDefendingSide: string;
  typeCode: number;
  typeDescKey: string;
  sortOrder: number;
  details?: Details;
}
interface TeamGameStat {
  category: string;
  awayValue: number | string;
  homeValue: number | string;
}
interface SeriesTeam {
  id: string;
  abbrev: string;
  logo: string;
  score: number;
}
interface Series {
  id: string;
  season: number;
  gameType: number;
  gameDate: string;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  gameState: string;
  gameScheduleState: string;
  awayTeam: SeriesTeam;
  homeTeam: SeriesTeam;
  clock: Clock;
  gameCenterLink: string;
  periodDescriptor: PeriodDescriptor;
  gameOutcome: GameOutcome;
}
interface SeasonSeriesWins {
  awayTeamWins: number;
  homeTeamWins: number;
}
interface ByPeriod {
  periodDescriptor: PeriodDescriptor;
  away: number;
  home: number;
}
interface Totals {
  away: number;
  home: number;
}
interface Linescore {
  byPeriod: ByPeriod[];
  totals: Totals;
}
interface GameReports {
  gameSummary: string;
  eventSummary: string;
  playByPlay: string;
  faceoffSummary: string;
  faceoffComparison: string;
  rosters: string;
  shotSummary: string;
  shiftChart: string;
  toiAway: string;
  toiHome: string;
}
interface Scratch {
  id: string;
  firstName: LocalizedString;
  lastName: LocalizedString;
}
interface TeamInfo {
  headCoach: LocalizedString;
  scratches: Scratch[];
}
interface GameInfo {
  referees: LocalizedString[];
  linesmen: LocalizedString[];
  awayTeam: TeamInfo;
  homeTeam: TeamInfo;
}
interface Summary {
  teamGameStats: TeamGameStat[];
  seasonSeries: Series[];
  seasonSeriesWins: SeasonSeriesWins;
  linescore: Linescore;
  shotsByPeriod: ByPeriod[];
  gameReports: GameReports;
  gameInfo: GameInfo;
  iceSurface: IceSurface;
}

interface GameTeamInfo {
    forwards: GameTeamInfoPlayer[]
    defensemen: GameTeamInfoPlayer[]
    goalies: GameTeamInfoPlayer[]
    penaltyBox: GameTeamInfoPlayer[]
}
interface IceSurface {
    awayTeam: GameTeamInfo;
    homeTeam: GameTeamInfo;
}

export interface RosterPlayer {
  teamId: string;
  playerId: string;
  firstName: LocalizedString;
  lastName: LocalizedString;
  sweaterNumber: number;
  positionCode: string;
  headshot: string;

}

export interface GameTeamInfoPlayer extends RosterPlayer {
  totalSOI: number;
}


export interface PlayByPlayResponse {
  id: string;
  season: number;
  gameType: number;
  gameDate: string;
  venue: LocalizedString;
  venueLocation: LocalizedString;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  tvBroadcasts: TvBroadcast[];
  gameState: string;
  gameScheduleState: string;
  periodDescriptor: PeriodDescriptor;
  awayTeam: Team;
  homeTeam: Team;
  clock: Clock;
  displayPeriod: number;
  gameOutcome: GameOutcome;
  plays: Play[];
  summary: Summary;
  rosterSpots: RosterPlayer[];

}