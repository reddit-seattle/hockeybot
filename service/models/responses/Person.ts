export module Person {

    export interface CurrentTeam {
        id: string;
        name: string;
        link: string;
    }

    export interface PrimaryPosition {
        code: string;
        name: string;
        type: string;
        abbreviation: string;
    }

    export interface Person {
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

    export interface Response {
        copyright: string;
        people: Person[];
    }

}

