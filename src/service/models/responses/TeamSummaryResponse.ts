export interface TeamSummary {
    faceoffWinPct: number; // 0.472557,
    gamesPlayed: number; // 32,
    goalsAgainst: number; // 81,
    goalsAgainstPerGame: number; // 2.53125,
    goalsFor: number; // 109,
    goalsForPerGame: number; // 3.40625,
    losses: number; // 9,
    otLosses: number; // 3,
    penaltyKillNetPct: number; // 0.78125,
    penaltyKillPct: number; // 0.75,
    pointPct: number; // 0.67187,
    points: number; // 43,
    powerPlayNetPct: number; // 0.161616,
    powerPlayPct: number; // 0.181818,
    regulationAndOtWins: number; // 20,
    seasonId: number; // 20232024,
    shotsAgainstPerGame: number; // 28.75,
    shotsForPerGame: number; // 31.0625,
    teamFullName: string; // "Winnipeg Jets",
    teamId: number; // 52,
    ties: number; // null,
    wins: number; // 20,
    winsInRegulation: number; // 18,
    winsInShootout: number; // 0
};

export interface TeamSummaryResponse {
    data: TeamSummary[]
    total: number;
}

