import { LocalizedString } from "./Common";

export interface Player {
    id: number;
    headshot: string;
    firstName: LocalizedString;
    lastName: LocalizedString;
    sweaterNumber: number;
    positionCode: string;
    shootsCatches: string;
    heightInInches: number;
    weightInPounds: number;
    heightInCentimeters: number;
    weightInKilograms: number;
    birthDate: string;
    birthCity: LocalizedString;
    birthCountry: string;
    birthStateProvince?: LocalizedString;
}
export interface TeamRosterResponse {
    forwards: Player[];
    defensemen: Player[];
    goalies: Player[];
}
