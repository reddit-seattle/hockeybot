export module Team {
    export interface TimeZone {
        id: string;
        offset: number;
        tz: string;
    }

    export interface Venue {
        name: string;
        link: string;
        city: string;
        timeZone: TimeZone;
        id?: number;
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

    export interface Team {
        id: string;
        name: string;
        link: string;
        venue: Venue;
        abbreviation: string;
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

    export interface Response {
        copyright: string;
        teams: Team[];
    }
}