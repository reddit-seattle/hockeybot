declare module StandingsResponse {

    export interface League {
        id: string;
        name: string;
        link: string;
    }

    export interface Division {
        id: string;
        name: string;
        nameShort: string;
        link: string;
        abbreviation: string;
    }

    export interface Conference {
        id: string;
        name: string;
        link: string;
    }

    export interface Team {
        id: string;
        name: string;
        link: string;
    }

    export interface LeagueRecord {
        wins: number;
        losses: number;
        ot: number;
        type: string;
    }

    export interface Streak {
        streakType: string;
        streakNumber: number;
        streakCode: string;
    }

    export interface TeamRecord {
        team: Team;
        leagueRecord: LeagueRecord;
        regulationWins: number;
        goalsAgainst: number;
        goalsScored: number;
        points: number;
        divisionRank: string;
        divisionL10Rank: string;
        divisionRoadRank: string;
        divisionHomeRank: string;
        conferenceRank: string;
        conferenceL10Rank: string;
        conferenceRoadRank: string;
        conferenceHomeRank: string;
        leagueRank: string;
        leagueL10Rank: string;
        leagueRoadRank: string;
        leagueHomeRank: string;
        wildCardRank: string;
        row: number;
        gamesPlayed: number;
        streak: Streak;
        pointsPercentage: number;
        ppDivisionRank: string;
        ppConferenceRank: string;
        ppLeagueRank: string;
        lastUpdated: Date;
    }

    export interface Record {
        standingsType: string;
        league: League;
        division: Division;
        conference: Conference;
        teamRecords: TeamRecord[];
    }

    export interface Response {
        copyright: string;
        records: Record[];
    }

}

