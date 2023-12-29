declare module TeamStatsResponse {

    export interface GameType {
        id: string;
        description: string;
        postseason: boolean;
    }

    export interface Type {
        displayName: string;
        gameType: GameType;
    }

    export interface Stats {
        gamesPlayed: number;
        wins: any;
        losses: any;
        ot: any;
        pts: any;
        ptPctg: string;
        goalsPerGame: any;
        goalsAgainstPerGame: any;
        evGGARatio: any;
        powerPlayPercentage: string;
        powerPlayGoals: any;
        powerPlayGoalsAgainst: any;
        powerPlayOpportunities: any;
        penaltyKillPercentage: string;
        shotsPerGame: any;
        shotsAllowed: any;
        winScoreFirst: any;
        winOppScoreFirst: any;
        winLeadFirstPer: any;
        winLeadSecondPer: any;
        winOutshootOpp: any;
        winOutshotByOpp: any;
        faceOffsTaken: any;
        faceOffsWon: any;
        faceOffsLost: any;
        faceOffWinPercentage: string;
        shootingPctg: number;
        savePctg: number;
        penaltyKillOpportunities: string;
        savePctRank: string;
        shootingPctRank: string;
    }

    export interface Team {
        id: string;
        name: string;
        link: string;
    }

    export interface Split {
        stat: Stats;
        team: Team;
    }

    export interface StatsObj {
        type: Type;
        splits: Split[];
    }

    export interface Response {
        copyright: string;
        stats: StatsObj[];
    }

}

