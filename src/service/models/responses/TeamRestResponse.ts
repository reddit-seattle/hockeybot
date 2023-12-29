export interface Team {
    id: number;
    fullName: string;
    leagueId: number;
    rawTricode: string
    triCode: string;
}

export interface TeamRestResponse {
    data: Team[]
    total: number;
}