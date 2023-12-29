import { LocalizedString } from "./Common";

interface TvBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
}
interface PeriodDescriptor {
  number: number;
  periodType: string;
}
interface AwayTeam {
  id: number;
  name: LocalizedString;
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
interface Details {
  eventOwnerTeamId?: number;
  losingPlayerId?: number;
  winningPlayerId?: number;
  xCoord?: number;
  yCoord?: number;
  zoneCode?: string;
  reason?: string;
  hittingPlayerId?: number;
  hitteePlayerId?: number;
  playerId?: number;
  shotType?: string;
  shootingPlayerId?: number;
  goalieInNetId?: number;
  awaySOG?: number;
  homeSOG?: number;
  blockingPlayerId?: number;
  scoringPlayerId?: number;
  scoringPlayerTotal?: number;
  assist1PlayerId?: number;
  assist1PlayerTotal?: number;
  assist2PlayerId?: number;
  assist2PlayerTotal?: number;
  awayScore?: number;
  homeScore?: number;
  secondaryReason?: string;
  typeCode?: string;
  descKey?: string;
  duration?: number;
  committedByPlayerId?: number;
  drawnByPlayerId?: number;
}
interface Play {
  eventId: number;
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
  id: number;
  abbrev: string;
  logo: string;
  score: number;
}
interface Series {
  id: number;
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
  id: number;
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
}
export interface PlayByPlayResponse {
  id: number;
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
  awayTeam: AwayTeam;
  homeTeam: AwayTeam;
  clock: Clock;
  displayPeriod: number;
  gameOutcome: GameOutcome;
  plays: Play[];
  summary: Summary;
}