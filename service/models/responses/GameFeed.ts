export module GameFeedResponse {

    export interface MetaData {
        wait: number;
        timeStamp: string;
    }

    export interface Game {
        pk: string;
        season: string;
        type: string;
    }

    export interface Datetime {
        dateTime: Date;
        endDateTime: Date;
    }

    export interface Status {
        abstractGameState: string;
        codedGameState: string;
        detailedState: string;
        statusCode: string;
        startTimeTBD: boolean;
    }

    export interface TimeZone {
        id: string;
        offset: number;
        tz: string;
    }

    export interface Venue {
        id: string;
        name: string;
        link: string;
        city: string;
        timeZone: TimeZone;
    }

    export interface Division {
        id: string;
        name: string;
        link: string;
    }

    export interface Conference {
        id: string;
        name: string;
        link: string;
    }

    export interface Franchise {
        franchiseId: string;
        teamName: string;
        link: string;
    }

    export interface Away {
        id: string;
        name: string;
        link: string;
        venue: Venue;
        abbreviation: string;
        triCode: string;
        teamName: string;
        locationName: string;
        firstYearOfPlay: string;
        division: Division;
        conference: Conference;
        franchise: Franchise;
        shortName: string;
        officialSiteUrl: string;
        franchiseId: string;
        active: boolean;
    }

    export interface Home {
        id: string;
        name: string;
        link: string;
        venue: Venue;
        abbreviation: string;
        triCode: string;
        teamName: string;
        locationName: string;
        firstYearOfPlay: string;
        division: Division;
        conference: Conference;
        franchise: Franchise;
        shortName: string;
        officialSiteUrl: string;
        franchiseId: string;
        active: boolean;
    }

    export interface Teams {
        away: Away;
        home: Home;
    }

    export interface LineScoreTeam {
        team: CurrentTeam;
        goals: number;
        shotsOnGoal: number;
        numSkaters: number,
        goaliePulled: boolean;
        powerPlay: boolean;
    }
    export interface LineScoreTeams {
        away: LineScoreTeam;
        home: LineScoreTeam;
    }
    export interface CurrentTeam {
        id: string;
        name: string;
        link: string;
        triCode: string;
    }

    export interface PrimaryPosition {
        code: string;
        name: string;
        type: string;
        abbreviation: string;
    }

    export interface PlayerObject {
        id: string;
        fullName: string;
        link: string;
        firstName: string;
        lastName: string;
        primaryNumber: string;
        birthDate: string;
        currentAge: number;
        birthCity: string;
        birthStateProvince: string;
        birthCountry: string;
        nationality: string;
        height: string;
        weight: number;
        active: boolean;
        alternateCaptain: boolean;
        captain: boolean;
        rookie: boolean;
        shootsCatches: string;
        rosterStatus: string;
        currentTeam: CurrentTeam;
        primaryPosition: PrimaryPosition;
    }

    export interface Players {
        [id: string]: PlayerObject;
    }

    export interface GameData {
        game: Game;
        datetime: Datetime;
        status: Status;
        teams: Teams;
        players: Players;
        venue: Venue;
    }

    export interface Strength {
        code: string;
        name: string;
    }

    export interface Result {
        event: string;
        eventCode: string;
        eventTypeId: string;
        description: string;
        secondaryType: string;
        strength: Strength;
        gameWinningGoal?: boolean;
        emptyNet?: boolean;
        penaltySeverity: string;
        penaltyMinutes?: number;
    }

    export interface Goals {
        away: number;
        home: number;
    }

    export interface About {
        eventIdx: number;
        eventId: string;
        period: number;
        periodType: string;
        ordinalNum: string;
        periodTime: string;
        periodTimeRemaining: string;
        dateTime: Date;
        goals: Goals;
    }

    export interface Coordinates {
        x?: number;
        y?: number;
    }

    export interface Player {
        player: Player;
        playerType: string;
        seasonTotal?: number;
    }

    export interface Team {
        id: string;
        name: string;
        link: string;
        triCode: string;
    }

    export interface AllPlay {
        result: Result;
        about: About;
        coordinates: Coordinates;
        players: Player[];
        team: Team;
    }

    export interface PlaysByPeriod {
        startIndex: number;
        plays: number[];
        endIndex: number;
    }

    export interface CurrentPlay {
        result: Result;
        about: About;
        coordinates: Coordinates;
    }

    export interface Plays {
        allPlays: AllPlay[];
        scoringPlays: number[];
        penaltyPlays: number[];
        playsByPeriod: PlaysByPeriod[];
        currentPlay: CurrentPlay;
    }

    export interface Period {
        periodType: string;
        startTime: Date;
        endTime: Date;
        num: number;
        ordinalNum: string;
        home: Home;
        away: Away;
    }

    export interface ShootoutInfo {
        away: Away;
        home: Home;
    }

    export interface IntermissionInfo {
        intermissionTimeRemaining: number;
        intermissionTimeElapsed: number;
        inIntermission: boolean;
    }

    export interface Linescore {
        currentPeriod: number;
        currentPeriodOrdinal: string;
        currentPeriodTimeRemaining: string;
        periods: Period[];
        shootoutInfo: ShootoutInfo;
        teams: LineScoreTeams;
        powerPlayStrength: string;
        hasShootout: boolean;
        intermissionInfo: IntermissionInfo;
    }

    export interface TeamSkaterStats {
        goals: number;
        pim: number;
        shots: number;
        powerPlayPercentage: string;
        powerPlayGoals: number;
        powerPlayOpportunities: number;
        faceOffWinPercentage: string;
        blocked: number;
        takeaways: number;
        giveaways: number;
        hits: number;
    }

    export interface TeamStats {
        teamSkaterStats: TeamSkaterStats;
    }

    export interface Person {
        id: string;
        fullName: string;
        link: string;
        shootsCatches: string;
        rosterStatus: string;
    }

    export interface Position {
        code: string;
        name: string;
        type: string;
        abbreviation: string;
    }

    export interface GoalieStats {
        timeOnIce: string;
        assists: number;
        goals: number;
        pim: number;
        shots: number;
        saves: number;
        powerPlaySaves: number;
        shortHandedSaves: number;
        evenSaves: number;
        shortHandedShotsAgainst: number;
        evenShotsAgainst: number;
        powerPlayShotsAgainst: number;
        decision: string;
        savePercentage: number;
        powerPlaySavePercentage: number;
        shortHandedSavePercentage: number;
        evenStrengthSavePercentage: number;
    }

    export interface Stats {
        goalieStats: GoalieStats;
    }

    export interface PlayerBasicObj {
        person: Person;
        jerseyNumber: string;
        position: Position;
        stats: Stats;
    }

    export interface OnIcePlu {
        playerId: string;
        shiftDuration: number;
        stamina: number;
    }
    export interface Coach {
        person: Person;
        position: Position;
    }

    export interface Official {
        official: Official;
        officialType: string;
    }

    export interface Boxscore {
        teams: Teams;
        officials: Official[];
    }

    export interface Winner {
        id: string;
        fullName: string;
        link: string;
    }

    export interface Loser {
        id: string;
        fullName: string;
        link: string;
    }

    export interface FirstStar {
        id: string;
        fullName: string;
        link: string;
    }

    export interface SecondStar {
        id: string;
        fullName: string;
        link: string;
    }

    export interface ThirdStar {
        id: string;
        fullName: string;
        link: string;
    }

    export interface Decisions {
        winner: Winner;
        loser: Loser;
        firstStar: FirstStar;
        secondStar: SecondStar;
        thirdStar: ThirdStar;
    }

    export interface LiveData {
        plays: Plays;
        linescore: Linescore;
        boxscore: Boxscore;
        decisions: Decisions;
    }

    export interface Response {
        copyright: string;
        gamePk: number;
        link: string;
        metaData: MetaData;
        gameData: GameData;
        liveData: LiveData;
    }

}

