import fetch from 'node-fetch';
import { format } from 'date-fns-tz';
import { Environment, Paths } from "../utils/constants";
import { ScheduleResponse } from "./models/responses/Schedule";
import { GameFeedResponse } from './models/responses/GameFeed';
import { TeamResponse } from "./models/responses/Teams";
import { StandingsTypes } from "../models/StandingsTypes";
import { Roster } from "./models/responses/Roster";
import { Person } from "./models/responses/Person";
import { PlayerStats } from "./models/responses/PlayerStats";
import { GameContentResponse } from './models/responses/GameContentResponse';

export async function get<T>(
    url: string
): Promise<T> {
    const response = await fetch(url);
    const body = await response.json();
    return body;
}
export module API {

    export module Schedule {
        export const GetSchedule: (date?: string) => Promise<ScheduleResponse.Game[]> = 
            async (date) => {
                const response = await
                    get<ScheduleResponse.Response>(
                        date
                            ? Paths.Get.ScheduleByDate(date)
                            : Paths.Get.Schedule
                    );
                return response.dates.reduce((prev, curr) => prev.concat(curr.games), [] as ScheduleResponse.Game[])
            }
        export const GetTeamSchedule: (teamId: string, start?: string, end?: string) => Promise<ScheduleResponse.Game[]> =
            async (id, start, end) => {
                const endpoint = 
                    start
                        ? Paths.Get.TeamScheduleByDate(id, start, end)
                        : Paths.Get.TeamSchedule(id);
                if(Environment.DEBUG) {
                    console.log(`GetTeamSchedule: ${endpoint}`);
                }
                const response = await get<ScheduleResponse.Response>(endpoint);
                return response.dates.reduce((prev, curr) => prev.concat(curr.games), [] as ScheduleResponse.Game[])
            }

    }

    export module Teams {
        export const GetTeams: () => Promise<TeamResponse.Team[]> = async () => {
            const response = await get<TeamResponse.Response>(Paths.Get.Teams);
            return response.teams;
        }

        export const GetTeam: (id: string) => Promise<TeamResponse.Team | undefined> = async (id) => {
            const response = await get<TeamResponse.Response>(Paths.Get.Team(id));
            return response?.teams?.[0];
        }

        export const GetTeamsLastGame: (id: string) => Promise<ScheduleResponse.Game> = async (id) => {
            const response = await get<any>(Paths.Get.TeamLastGame(id));
            return response?.teams?.[0]?.previousGameSchedule?.dates?.[0]?.games?.[0];
        }

        export const GetTeamByAbbreviation: (abbr: string | undefined) => Promise<TeamResponse.Team | undefined> = async (abbr) => {
            const response = await get<TeamResponse.Response>(Paths.Get.Teams);
            const teams = response?.teams?.filter(team => team.abbreviation.toLowerCase() == abbr?.toLowerCase())
            return teams?.[0];
        }
        export const GetRoster: (id: string) => Promise<Roster.Player[]> = async (id) => {
            const response = await get<Roster.Response>(Paths.Get.Roster(id));
            return response?.roster;
        }

    }

    export module Seasons {
        export const GetSeasons: () => Promise<SeasonsResponse.Season[]> = async () => {
            const response = await get<SeasonsResponse.Response>(Paths.Get.Seasons);
            return response.seasons;
        }
        export const GetCurrentSeason: () => Promise<SeasonsResponse.Season | undefined> = async () => {
            const seasons = await GetSeasons();
            return seasons?.reverse().shift();
        }

    }
    export module Stats {
        export const TeamStats: (id: string) => Promise<TeamStatsResponse.Stats> = async (id) => {
            const response = await get<TeamStatsResponse.Response>(Paths.Get.TeamStats(id));
            const statsObj = response?.stats?.filter(stat => stat.type.displayName === 'statsSingleSeason')?.[0];
            return statsObj?.splits?.[0].stat;
        }
    }

    export module Standings {
        export const GetStandings: (type?: StandingsTypes) => Promise<StandingsResponse.Record[]> = async (type) => {
            const response = await get<StandingsResponse.Response>(
                type
                    ? Paths.Get.CustomStandings(type)
                    : Paths.Get.Standings
            );

            return response?.records;
        }
    }

    export module Games {
        export const GetGameById: (id: string) => Promise<GameFeedResponse.Response> = async(id) => {
            const response = await get<GameFeedResponse.Response>(Paths.Get.GameFeed(id));
            return response;
        }

        export const GetGameDiff: (id: string, since: string) => Promise<GameFeedResponse.Response> = async(id, since) => {
            const timecode = format(since, "yyyyMMdd_HHmmss");
            const response = await get<GameFeedResponse.Response>(Paths.Get.GameFeedDiff(id, timecode));
            return response;
        }

        export const GetGameContent: (id: string) => Promise<GameContentResponse.Response> = async(id) => {
            const response = await get<GameContentResponse.Response>(Paths.Get.GameContent(id));
            return response;
        }
    }

    export module Players {
        export const GetPlayerById: (id: string) => Promise<Person.Person> = async(id) => {
            const response = await get<Person.Response>(Paths.Get.Person(id));
            return response?.people?.[0];
        }
        export const GetPlayerSeasonStats: (id: string) => Promise<PlayerStats.Stat>  = async(id) => {
            const response = await get<PlayerStats.Rseponse>(Paths.Get.PersonSeasonStats(id));
            return response?.stats?.[0]?.splits?.[0]?.stat;
        }
    }
}