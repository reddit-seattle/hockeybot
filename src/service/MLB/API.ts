import { Paths } from "../../utils/constants";
import { ApiDateString, get } from "../../utils/helpers";
import { GameFeedResponse } from "./models/GameFeed";
import { ScheduleResponse } from "./models/Schedule";

export namespace API {
    export namespace Schedule {
        export const Today = async (teamId?: string) => {
            const response = await get<ScheduleResponse>(
                teamId ? Paths.MLB.Schedule.Custom(undefined, teamId) : Paths.MLB.Schedule.All
            );
            return response.dates[0].games ?? [];
        };
        export const ByDate = async (date?: Date, teamId?: string) => {
            const dateInput = date && date instanceof Date ? ApiDateString(date) : undefined;
            const response = await get<ScheduleResponse>(Paths.MLB.Schedule.Custom(dateInput, teamId));
            return response.dates[0].games ?? [];
        };
    }
    export namespace LiveGames {
        export const ById = async (id: string) => get<GameFeedResponse>(Paths.MLB.Games.ById(id));
    }
    // TODO - types
    export namespace Teams {
        export const ById = async (id: string) => get<any>(Paths.MLB.Teams.ById(id));
        export const All = async () => get<any>(Paths.MLB.Teams.All);
    }

}
