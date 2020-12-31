import { Environment, Paths } from "../utils/constants";
import { Schedule as ScheduleResponse } from "./models/responses/Schedule";
import { Team as TeamResponse } from "./models/responses/Teams";
import fetch from 'node-fetch';

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

        export const GetTeamByAbbreviation: (abbr: string) => Promise<TeamResponse.Team | undefined> = async (abbr) => {
            const response = await get<TeamResponse.Response>(Paths.Get.Teams);
            const teams = response?.teams?.filter(team => team.abbreviation.toLowerCase() == abbr.toLowerCase())
            return teams?.[0];
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
}