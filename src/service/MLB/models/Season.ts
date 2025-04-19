export interface Season {
    seasonId: string;
    hasWildcard: boolean;
    preSeasonStartDate: string;
    preSeasonEndDate: string;
    seasonStartDate: string;
    springStartDate: string;
    springEndDate: string;
    regularSeasonStartDate: string;
    lastDate1stHalf: string;
    allStarDate: string;
    firstDate2ndHalf: string;
    regularSeasonEndDate: string;
    postSeasonStartDate: string;
    postSeasonEndDate: string;
    seasonEndDate: string;
    offseasonStartDate: string;
    offSeasonEndDate: string;
    seasonLevelGamedayType: string;
    gameLevelGamedayType: string;
    qualifierPlateAppearances: number;
    qualifierOutsPitched: number;
}

export interface SeasonResponse {
    seasons: Season[];
    copyright: string;
}
