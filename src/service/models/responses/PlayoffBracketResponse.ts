import { LocalizedString } from "./Common";

export interface PlayoffBracketResponse {
    bracketLogo: string;
    bracketLogoFr: string;
    series: Series[];
}

export interface Series {
    seriesUrl: string;
    seriesTitle: string;
    seriesAbbrev: string;
    seriesLetter: string;
    playoffRound: number;
    topSeedRank: number;
    topSeedRankAbbrev: string;
    topSeedWins: number;
    bottomSeedRank: number;
    bottomSeedRankAbbrev: string;
    bottomSeedWins: number;
    winningTeamId: number;
    losingTeamId: number;
    topSeedTeam: TopSeedTeam;
    bottomSeedTeam: BottomSeedTeam;
    seriesLogo?: string;
    seriesLogoFr?: string;
    conferenceAbbrev?: string;
    conferenceName?: string;
}

export interface TopSeedTeam {
    id: number;
    abbrev: string;
    name: LocalizedString;
    commonName: LocalizedString;
    placeNameWithPreposition: LocalizedString;
    logo: string;
    darkLogo: string;
}

export interface BottomSeedTeam {
    id: number;
    abbrev: string;
    name: LocalizedString;
    commonName: LocalizedString;
    placeNameWithPreposition: LocalizedString;
    logo: string;
    darkLogo: string;
}
