export module PlayerStats {

    export interface GameType {
        id: string;
        description: string;
        postseason: boolean;
    }

    export interface Type {
        displayName: string;
        gameType: GameType;
    }

    export interface Stat {
        timeOnIce: string;
        assists: number;
        goals: number;
        pim: number;
        shots: number;
        games: number;
        hits: number;
        powerPlayGoals: number;
        powerPlayPoints: number;
        powerPlayTimeOnIce: string;
        evenTimeOnIce: string;
        penaltyMinutes: string;
        faceOffPct: number;
        shotPct: number;
        gameWinningGoals: number;
        overTimeGoals: number;
        shortHandedGoals: number;
        shortHandedPoints: number;
        shortHandedTimeOnIce: string;
        blocked: number;
        plusMinus: number;
        points: number;
        shifts: number;
        timeOnIcePerGame: string;
        evenTimeOnIcePerGame: string;
        shortHandedTimeOnIcePerGame: string;
        powerPlayTimeOnIcePerGame: string;
    }

    export interface Split {
        season: string;
        stat: Stat;
    }

    export interface StatObj {
        type: Type;
        splits: Split[];
    }

    export interface Rseponse {
        copyright: string;
        stats: StatObj[];
    }

}

