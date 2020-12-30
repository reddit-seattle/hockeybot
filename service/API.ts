import { Paths } from "../utils/constants";
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
        export const GetSchedule: (date?: string) => Promise<ScheduleResponse.Game[]> = async (date) => {
            const response = await
                get<ScheduleResponse.Response>(
                    date
                    ? Paths.Get.ScheduleByDate(date) 
                    : Paths.Get.Schedule
                );
            return response.dates.reduce((prev, curr) => prev.concat(curr.games), [] as ScheduleResponse.Game[])
        }
        
    }

    export module Teams {
        export const GetTeams: () => Promise<TeamResponse.Team[]> = async () => {
            const response = await get<TeamResponse.Response>(Paths.Get.Teams);
            return response.teams;
        }
    }
}