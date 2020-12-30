import dotenv from 'dotenv';
dotenv.config();

export module Config {
    export const prefix: string = '$nhl';
}

export module Environment {
    export const botToken = process.env['bot_token'] || undefined;
    export const DEBUG = process.env['hockeybotDEBUG'] || undefined;
}

export module Paths {
    export const API_HOST_URL: string = `https://statsapi.web.nhl.com`;
    export const API_PART: string = 'api/v1';
    
    export module Get {
        export const Schedule: string = `${API_HOST_URL}/${API_PART}/schedule`;
        export const ScheduleByDate:(startDate: string, endDate?: string) => string = 
            (start, end) => `${Paths.Get.Schedule}?startDate=${start}&endDate=${end || start}`;

        export const TeamSchedule: (id: string) => string =
            (id) => `${Schedule}?teamId=${id}`;
    
        export const TeamScheduleByDate :(team: string, startDate: string, endDate?: string) => string =
            (id, start, end) => `${Schedule}?teamId=${id}&startDate=${start}&endDate=${end || start}`;

        export const Teams: string = `${API_HOST_URL}/${API_PART}/teams`;
        export const Team:(id: string) => string = (id) => `${Paths.Get.Teams}/${id}`;

        export const Divisions: string = `${API_HOST_URL}/${API_PART}/divisions`;
        export const Division: (id: string) => string =
            (id) => `${Paths.Get.Divisions}/${id}`;

        export const Conferences: string = `${API_HOST_URL}/${API_PART}/conferences`;
        export const Conference: (id: string) => string =
            (id) => `${Paths.Get.Conferences}/${id}`;
        
        export const People: string = `${API_HOST_URL}/${API_PART}/people`;
        export const Person:(id: string) => string =
            (id) => `${Paths.Get.People}/${id}`;

        export const Seasons: string = `${API_HOST_URL}/${API_PART}/seasons`;
    }

    
}