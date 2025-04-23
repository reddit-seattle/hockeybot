interface Venue {
    id: number;
    name: string;
    link: string;
}
interface League {
    id?: number;
    name?: string;
    link: string;
}
interface SpringLeague {
    id: number;
    name: string;
    link: string;
    abbreviation: string;
}
interface SpringVenue {
    id: number;
    link: string;
}
interface Team {
    allStarStatus?: string;
    id: number;
    name: string;
    link: string;
    season: number;
    venue: Venue;
    teamCode: string;
    fileCode?: string;
    abbreviation: string;
    teamName: string;
    locationName?: string;
    firstYearOfPlay?: string;
    league: League;
    sport: Venue;
    shortName: string;
    parentOrgName?: string;
    parentOrgId?: number;
    franchiseName?: string;
    clubName?: string;
    active: boolean;
    division?: Venue;
    springLeague?: SpringLeague;
    springVenue?: SpringVenue;
}
export interface TeamResponse {
    copyright: string;
    teams: Team[];
}
