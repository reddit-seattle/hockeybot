export namespace PlayoffStandings {

    export interface RoundNames {
        name: string;
        shortName: string;
    }

    export interface Format {
        name: string;
        description: string;
        numberOfGames: number;
        numberOfWins: number;
    }

    export interface SeriesNames {
        matchupName: string;
        matchupShortName: string;
        teamAbbreviationA: string;
        teamAbbreviationB: string;
        seriesSlug: string;
    }

    export interface SeriesSummary {
        gamePk: number;
        gameNumber: number;
        gameLabel: string;
        necessary: boolean;
        gameCode: number;
        gameTime: Date;
        seriesStatus: string;
        seriesStatusShort: string;
    }

    export interface CurrentGame {
        seriesSummary: SeriesSummary;
    }

    export interface Conference {
        id: number;
        name: string;
        link: string;
    }

    export interface RoundDetails {
        number: number;
    }

    export interface Team {
        id: number;
        name: string;
        link: string;
    }

    export interface Seed {
        type: string;
        rank: number;
        isTop: boolean;
    }

    export interface SeriesRecord {
        wins: number;
        losses: number;
    }

    export interface MatchupTeam {
        team: Team;
        seed: Seed;
        seriesRecord: SeriesRecord;
    }

    export interface Series {
        seriesNumber: number;
        seriesCode: string;
        names: SeriesNames;
        currentGame: CurrentGame;
        conference: Conference;
        round: RoundDetails;
        matchupTeams: MatchupTeam[];
    }

    export interface Round {
        number: number;
        code: number;
        names: RoundNames;
        format: Format;
        series: Series[];
    }

    export interface Response {
        copyright: string;
        id: number;
        name: string;
        season: string;
        defaultRound: number;
        rounds: Round[];
    }

}

