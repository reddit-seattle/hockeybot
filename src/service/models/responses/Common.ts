export interface LocalizedString {
    default: string;
    es?: string;
    fr?: string;
    cs?: string;
    sk?: string;
    fi?: string;
  }

  export interface PlayerSearchResult {
    playerId: string;
    name: string;
    positionCode: string;
    teamId: string;
    teamAbbrev: string;
    lastTeamId: string;
    lastTeamAbbrev: string;
    lastSeasonId?: string;
    sweaterNumber?: number;
    active: boolean;
    height: string;
    heightInCentimeters: number;
    weightInPounds: number;
    weightInKilograms: number;
    birthCity: string;
    birthStateProvince?: string;
    birthCountry: string;
  }