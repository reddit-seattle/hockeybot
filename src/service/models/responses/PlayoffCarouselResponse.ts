export interface PlayoffCarouselResponse {
    seasonId: number;
    currentRound: number;
    rounds: Round[];
}

export interface Round {
    roundNumber: number;
    roundLabel: string;
    roundAbbrev: string;
    series: Series[];
}

export interface Series {
    seriesLetter: string;
    roundNumber: number;
    seriesLabel: string;
    seriesLink: string;
    bottomSeed: Seed;
    topSeed: Seed;
    neededToWin: number;
    winningTeamId: number;
    losingTeamId: number;
}

export interface Seed {
    id: number;
    abbrev: string;
    wins: number;
    logo: string;
    darkLogo: string;
}
