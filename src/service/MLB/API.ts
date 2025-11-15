import { flatten } from "underscore";
import { Paths } from "../../utils/constants";
import { ApiDateString, get } from "../../utils/helpers";
import { GameFeedResponse } from "./models/GameFeed";
import { ScheduleResponse } from "./models/Schedule";
import { SeasonResponse } from "./models/Season";
import { TeamResponse } from "./models/Team";

export namespace API {
    export namespace Schedule {
        export const Today = async (teamId?: string) => {
            const response = await get<ScheduleResponse>(
                teamId ? Paths.MLB.Schedule.Filtered({ teamId }) : Paths.MLB.Schedule.All,
            );
            return response.dates?.[0]?.games ?? [];
        };
        export const ByDate = async (dateIn?: Date, teamId?: string) => {
            const date = dateIn && dateIn instanceof Date ? ApiDateString(dateIn) : undefined;
            const response = await get<ScheduleResponse>(Paths.MLB.Schedule.Filtered({ date, teamId }));
            return response.dates?.[0]?.games ?? [];
        };
        export const TeamSeason = async (teamId: string) => {
            const season = await Season();
            if (!season) return [];
            const { seasonId } = season;
            const response = await get<ScheduleResponse>(Paths.MLB.Schedule.Filtered({ teamId, seasonId }));
            return response.dates?.[0]?.games ?? [];
        };
        export const TeamNext = async (teamId: string, next: number = 1) => {
            const season = await Season();
            if (!season) return [];
            const { seasonId, seasonEndDate: endDate } = season;
            const startDate = ApiDateString(new Date(Date.now()));
            const response = await get<ScheduleResponse>(
                Paths.MLB.Schedule.Filtered({ startDate, endDate, teamId, seasonId }),
            );
            const allGames = flatten(response?.dates?.map((date) => date?.games) ?? []);
            return allGames.slice(0, next);
        };
    }
    export namespace LiveGames {
        export const ById = async (id: string) => get<GameFeedResponse>(Paths.MLB.Games.ById(id));
    }

    export namespace Teams {
        export const ById = async (id: string) => get<TeamResponse>(Paths.MLB.Teams.ById(id));
        export const All = async () => get<TeamResponse>(Paths.MLB.Teams.All);
    }

    export const Season = async () => {
        const response = await get<SeasonResponse>(Paths.MLB.Seasons);
        return response.seasons?.[0];
    };

    export namespace Standings {
        // https://statsapi.mlb.com/api/v1/standingsTypes
        // https://statsapi.mlb.com/api/v1/standings?leagueId=103&type=wildCard
        // 103 = AL, 104 = NL
        export const Current = async () => {
            const response = await get<any>(Paths.MLB.Standings.Current);
            return response;
        };
    }
}
