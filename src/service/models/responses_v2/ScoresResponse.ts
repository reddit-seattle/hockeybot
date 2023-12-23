import { LocalizedString } from "./Common";

export interface GameWeek {
  date: string;
  dayAbbrev: string;
  numberOfGames: number;
}
export interface OddsPartner {
  partnerId: number;
  country: string;
  name: string;
  imageUrl: string;
  siteUrl?: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

export interface TvBroadcast {
  id: number;
  market: string;
  countryCode: string;
  network: string;
}
export interface Team {
  id: number;
  name: LocalizedString;
  abbrev: string;
  score: number;
  sog: number;
  logo: string;
}
export interface Clock {
  timeRemaining: string;
  secondsRemaining: number;
  running: boolean;
  inIntermission: boolean;
}
export interface PeriodDescriptor {
  number: number;
  periodType: string;
}
export interface GameOutcome {
  lastPeriodType: string;
  otPeriods?: number;
}

export interface Goal {
  period: number;
  periodDescriptor: PeriodDescriptor;
  timeInPeriod: string;
  playerId: number;
  name: LocalizedString;
  mugshot: string;
  teamAbbrev: string;
  goalsToDate: number;
  awayScore: number;
  homeScore: number;
  strength: string;
  highlightClip: number;
  highlightClipFr?: number;
}
export interface Game {
  id: number;
  season: number;
  gameType: number;
  gameDate: string;
  venue: LocalizedString;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  tvBroadcasts: TvBroadcast[];
  gameState: string;
  gameScheduleState: string;
  awayTeam: Team;
  homeTeam: Team;
  gameCenterLink: string;
  threeMinRecap?: string;
  clock: Clock;
  neutralSite: boolean;
  venueTimezone: string;
  period: number;
  periodDescriptor: PeriodDescriptor;
  gameOutcome: GameOutcome;
  goals: Goal[];
  threeMinRecapFr?: string;
}
export interface ScoresResponse {
  prevDate: string;
  currentDate: string;
  nextDate: string;
  gameWeek: GameWeek[];
  oddsPartners: OddsPartner[];
  games: Game[];
}
