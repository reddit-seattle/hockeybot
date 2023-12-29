import fetch from 'node-fetch';
import { format, utcToZonedTime } from 'date-fns-tz';
import { Config, Environment, Legacy_Paths } from "../utils/constants";
import { ScheduleResponse } from "./models/legacy_responses/Schedule";
import { GameFeedResponse } from './models/legacy_responses/GameFeed';
import { TeamResponse } from "./models/legacy_responses/Teams";
import { StandingsTypes } from "../models/StandingsTypes";
import { Roster } from "./models/legacy_responses/Roster";
import { Person } from "./models/legacy_responses/Person";
import { PlayerStats } from "./models/legacy_responses/PlayerStats";
import { GameContentResponse } from './models/legacy_responses/GameContentResponse';
import { PlayoffStandings } from './models/legacy_responses/PlayoffStandings';
import { get } from '../utils/helpers';

export module API {

    export module Schedule {
        export const GetSchedule: (date?: string) => Promise<ScheduleResponse.Game[]> = 
            async (date) => {
                const response = await
                    get<ScheduleResponse.Response>(
                        date
                            ? Legacy_Paths.Get.ScheduleByDate(date)
                            : Legacy_Paths.Get.Schedule
                    );
                return response.dates.reduce((prev, curr) => prev.concat(curr.games), [] as ScheduleResponse.Game[])
            }
        export const GetTeamSchedule: (teamId: string, start?: string, end?: string) => Promise<ScheduleResponse.Game[]> =
            async (id, start, end) => {
                const endpoint = 
                    start
                        ? Legacy_Paths.Get.TeamScheduleByDate(id, start, end)
                        : Legacy_Paths.Get.TeamSchedule(id);
                if(Environment.DEBUG) {
                    console.log(`GetTeamSchedule: ${endpoint}`);
                }
                const response = await get<ScheduleResponse.Response>(endpoint);
                return response.dates.reduce((prev, curr) => prev.concat(curr.games), [] as ScheduleResponse.Game[])
            }

    }
    export module Teams {
        export const GetTeams: () => Promise<TeamResponse.Team[]> = async () => {
            const response = await get<TeamResponse.Response>(Legacy_Paths.Get.Teams);
            return response.teams;
        }

        export const GetTeam: (id: string) => Promise<TeamResponse.Team | undefined> = async (id) => {
            const response = await get<TeamResponse.Response>(Legacy_Paths.Get.Team(id));
            return response?.teams?.[0];
        }

        export const GetTeamsLastGame: (id: string) => Promise<ScheduleResponse.Game> = async (id) => {
            const response = await get<any>(Legacy_Paths.Get.TeamLastGame(id));
            return response?.teams?.[0]?.previousGameSchedule?.dates?.[0]?.games?.[0];
        }

        export const GetTeamByAbbreviation: (abbr: string | undefined) => Promise<TeamResponse.Team | undefined> = async (abbr) => {
            const response = await get<TeamResponse.Response>(Legacy_Paths.Get.Teams);
            const teams = response?.teams?.filter(team => team.abbreviation.toLowerCase() == abbr?.toLowerCase())
            return teams?.[0];
        }
        export const GetRoster: (id: string) => Promise<Roster.Player[]> = async (id) => {
            const response = await get<Roster.Response>(Legacy_Paths.Get.Roster(id));
            return response?.roster;
        }

    }
    export module Seasons {
        export const GetSeasons: () => Promise<SeasonsResponse.Season[]> = async () => {
            const response = await get<SeasonsResponse.Response>(Legacy_Paths.Get.Seasons);
            return response.seasons;
        }
        export const GetCurrentSeason: () => Promise<SeasonsResponse.Season | undefined> = async () => {
            const seasons = await GetSeasons();
            return seasons?.reverse().shift();
        }

    }
    export module Stats {
        export const TeamStats: (id: string) => Promise<TeamStatsResponse.Stats> = async (id) => {
            const response = await get<TeamStatsResponse.Response>(Legacy_Paths.Get.TeamStats(id));
            const statsObj = response?.stats?.filter(stat => stat.type.displayName === 'statsSingleSeason')?.[0];
            return statsObj?.splits?.[0].stat;
        }
    }
    export module Standings {
        export const GetStandings: (type?: StandingsTypes) => Promise<StandingsResponse.Record[]> = async (type) => {
            const response = await get<StandingsResponse.Response>(
                type
                    ? Legacy_Paths.Get.CustomStandings(type)
                    : Legacy_Paths.Get.Standings
            );

            return response?.records;
        }
    }
    export module Games {
        export const GetGameById: (id: string) => Promise<GameFeedResponse.Response> = async(id) => {
            const response = await get<GameFeedResponse.Response>(Legacy_Paths.Get.GameFeed(id));
            return response;
        }

        export const GetGameDiff: (id: string, since: string) => Promise<GameFeedResponse.Response> = async(id, since) => {
            const timecode = format(utcToZonedTime(since, Config.TIME_ZONE), "yyyyMMdd_HHmmss");
            const response = await get<GameFeedResponse.Response>(Legacy_Paths.Get.GameFeedDiff(id, timecode));
            return response;
        }

        export const GetGameContent: (id: string) => Promise<GameContentResponse.Response> = async(id) => {
            const response = await get<GameContentResponse.Response>(Legacy_Paths.Get.GameContent(id));
            return response;
        }
    }
    export module Players {
        export const GetPlayerById: (id: string) => Promise<Person.Person> = async(id) => {
            const response = await get<Person.Response>(Legacy_Paths.Get.Person(id));
            return response?.people?.[0];
        }
        export const GetPlayerSeasonStats: (id: string) => Promise<PlayerStats.Stat>  = async(id) => {
            const response = await get<PlayerStats.Rseponse>(Legacy_Paths.Get.PersonSeasonStats(id));
            return response?.stats?.[0]?.splits?.[0]?.stat;
        }
    }
    export module Playoffs {
        export const GetPlayoffStandings: () => Promise<PlayoffStandings.Round[]> = async() => {
            const response = await get<PlayoffStandings.Response>(Legacy_Paths.Get.PlayoffStandings);
            return response?.rounds;
        }
    }
}