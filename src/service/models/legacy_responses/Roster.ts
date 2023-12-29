export module Roster {
    export interface Player {
        person: Person;
        jerseyNumber: string;
        position: Position;
    }
    export interface Position {
        code: string;
        name: string;
        type: string;
        abbreviation: string;
    }
    export interface Person {
        id: string;
        fullName: string;
        link: string;
    }

    export interface Response {
        copyright: string;
        roster: Player[];
        link: string;
    }
}