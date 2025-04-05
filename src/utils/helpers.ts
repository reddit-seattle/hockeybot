import { addHours, format, getUnixTime } from "date-fns";
import { AutocompleteInteraction, SlashCommandStringOption } from "discord.js";
import { mkdirSync, writeFileSync } from "fs";
import { any, first } from "underscore";
import { API } from "../service/API";
import { PlayByPlayResponse } from "../service/models/responses/PlayByPlayResponse";
import { Environment } from "./constants";
import { ConferenceAbbrev, DivisionAbbrev, GameState, PeriodType, TeamTriCode } from "./enums";

// credit: Typescript documentation, src
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#index-types
export function getProperty<T, K extends keyof T>(o: T, propertyName: K): T[K] {
    return o[propertyName]; // o[propertyName] is of type T[K]
}

/**
 * Converts Date objects into yyyy-MM-dd strings that the API accepts as dates
 * @param date Optional date object. Current date is used if not defined.
 * @returns a string with the provided or current date formatted yyyy-MM-dd
 */
export const ApiDateString: (date?: Date) => string = (date) => {
    return format(date ?? new Date(), "yyyy-MM-dd");
};

/**
 * Typed "GET" for an API endpoint
 * @param url The API endpoint
 * @returns The JSON response typed as an object of the provided type T.
 */
export async function get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    const body = await response.json();
    return body;
}

//TODO - bring into it's own autocomplete module with name: method loaders
export const teamOrPlayerAutocomplete = async (interaction: AutocompleteInteraction) => {
    const value = interaction.options.getFocused(true);
    if (value.name == "team") {
        const choices = Object.keys(TeamTriCode);
        const filtered = choices.filter((choice) => choice.toUpperCase().startsWith(value.value.toUpperCase()));
        await interaction.respond(
            first(
                filtered.map((choice) => ({ name: choice, value: choice })),
                25
            )
        );
        return;
    }
    if (value.name == "player") {
        const choices = await API.Search.Player(value.value);
        await interaction.respond(
            choices
                ? first(
                      choices.map((choice) => ({
                          name: `${choice.name} [${choice.teamAbbrev}]`,
                          value: choice.playerId,
                      })),
                      25
                  )
                : []
        );
        return;
    }
};

export const validTeamName = (team: string) => {
    return (
        Object.keys(TeamTriCode)
            .map((key) => key.toUpperCase())
            .indexOf(team.toUpperCase()) > 0
    );
};

export const getOrdinal = (int: number) => {
    int = Math.round(int);
    let numString = int.toString();

    if (Math.floor(int / 10) % 10 === 1) {
        return `${numString}th`;
    }

    switch (int % 10) {
        case 1:
            return `${numString}st`;
        case 2:
            return `${numString}nd`;
        case 3:
            return `${numString}rd`;
        default:
            return `${numString}th`;
    }
};

export const periodToStr = (number: number, periodType: string) => {
    if (periodType == PeriodType.regulation) {
        return getOrdinal(number);
    } else {
        switch (number) {
            case 4:
                return "OT";
            case 5:
                return periodType == PeriodType.overtime ? "2OT" : "SO";
            case 6:
                return "3OT";
            case 7:
                return "4OT";
            case 8:
                return "5OT";
            case 9:
                return "6OT";
            default:
                return number;
        }
    }
};

export const isGameOver = (gameState: string) => {
    return ([GameState.hardFinal, GameState.softFinal, GameState.official] as string[]).includes(gameState);
};
export const hasGameStarted = (gameState: string) => {
    // TODO - is pre-game considered started?
    // I believe this happens ~30mins prior to actual game start
    return gameState != GameState.future;
};

export const optionalDateOption = (option: SlashCommandStringOption) =>
    option.setName("date").setDescription("YYYY-MM-DD please").setRequired(false);

export const requiredDivisionOption = (option: SlashCommandStringOption) =>
    option
        .setName("division")
        .setDescription("Which division")
        .setRequired(true)
        .addChoices(
            { name: "Atlantic", value: DivisionAbbrev.atlantic },
            { name: "Central", value: DivisionAbbrev.central },
            { name: "Metro", value: DivisionAbbrev.metro },
            { name: "Pacific", value: DivisionAbbrev.pacific }
        );

export const requiredConferenceOption = (option: SlashCommandStringOption) =>
    option
        .setName("conference")
        .setDescription("Which conference")
        .setRequired(true)
        .addChoices(
            { name: "Western", value: ConferenceAbbrev.western },
            { name: "Eastern", value: ConferenceAbbrev.eastern }
        );

export const requiredTeamOption = (option: SlashCommandStringOption) =>
    option.setName("team").setDescription("Team abbreviation (SEA)").setAutocomplete(true).setRequired(true);
export const requiredPlayerOption = (option: SlashCommandStringOption) =>
    option.setName("player").setDescription("Player query (Daccord)").setAutocomplete(true).setRequired(true);

export const relativeDateString = (input: string | Date) => {
    const time = getUnixTime(new Date(input));
    return `<t:${time}:R>`;
};

export const processLocalizedDateInput = (input?: string | Date | null) => {
    if (!input) {
        return undefined;
    }
    // all hail the pacific timezone
    return addHours(new Date(input), 8);
};

/**
 * TODO - This is absolutely ridiculous
 *
 */
export const getSituationCodeString = (situationCode?: string, homeScored: boolean = false) => {
    // console.log(`PROCESSING SITUATIONCODE: ${situationCode}`);
    if (!situationCode) {
        return undefined;
    }
    const SITUATION_TYPE_DICT: { [key: string]: string | undefined } = {
        "1551": "Even Strength",
        "1441": "4 on 4",
        "1331": "3 on 3",
        "1451": homeScored ? "Power Play" : "Shorthanded",
        "1541": homeScored ? "Shorthanded" : "Power Play",
        "1351": homeScored ? "5-3 Power Play" : "Shorthanded 3-5",
        "1531": homeScored ? "Shorthanded 3-5" : "5-3 Power Play",
        "1341": homeScored ? "4-3 Power Play" : "Shorthanded 3-4",
        "1431": homeScored ? "Shorthanded 3-4" : "4-3 Power Play",
        "1560": homeScored ? "Extra Attacker" : "Empty Net",
        "0651": homeScored ? "Empty Net" : "Extra Attacker",
        "0551": homeScored ? "Empty Net" : "Even Strength (EN)",
        "1550": homeScored ? "Even Strength (EN)" : "Empty Net",
        "1460": homeScored ? "Power Play (EN)" : "Shorthanded",
        "0641": homeScored ? "Shorthanded" : "Power Play (EN)",
        "1450": homeScored ? "Power Play" : "Empty Net (SH)", // this one feels weird
        "0541": homeScored ? "Empty Net (SH)" : "Power Play", // this one feels weird
        "1340": homeScored ? "4-3 Power Play (EN)" : "Empty Net (SH 3-4)",
        "0431": homeScored ? "Empty Net (SH 3-4)" : "4-3 Power Play (EN)",
        "0441": homeScored ? "Empty Net (4-4)" : "4 on 4 (EN)",
        "1440": homeScored ? "4 on 4 (EN)" : "Empty Net (4-4)",
        "1350": homeScored ? "5-3 Power Play (EN)" : "Empty Net (SH 3-5)",
        "0531": homeScored ? "Empty Net (SH 3-5)" : "5-3 Power Play (EN)",
        "1330": homeScored ? "3 on 3 (EN)" : "Empty Net (3-3)", // are these possible?
        "0331": homeScored ? "Empty Net (3-3)" : "3 on 3 (EN)", // are these possible?
    };
    // console.log(`SITUATIONCODE: ${situationCode} -> ${SITUATION_TYPE_DICT?.[situationCode]}`);
    return situationCode in SITUATION_TYPE_DICT ? `${SITUATION_TYPE_DICT[situationCode]} ` : undefined;
};

/**
 * logs the difference in the game feed
 * Returns an object of {added: [], removed: [], updated: []}
 *
 * @param oldFeed
 * @param newFeed
 */
export const logDiff = (oldFeed: PlayByPlayResponse | undefined, newFeed: PlayByPlayResponse) => {
    if (!oldFeed) {
        return { added: newFeed.plays, removed: [], updated: [] };
    }

    const { plays: oldPlays } = oldFeed;
    const { plays: newPlays } = newFeed;
    const oldIds = new Set(oldPlays.map((play) => play.eventId));
    const newIds = new Set(newPlays.map((play) => play.eventId));

    const added = oldPlays.filter((play) => !oldIds.has(play.eventId));
    const removed = oldPlays.filter((play) => !newIds.has(play.eventId));
    const updatedPlays = newPlays.filter((play) => oldIds.has(play.eventId));

    // check if the updated plays have actually changed, and only keep the updated fields
    const updated = updatedPlays.map((play) => {
        const oldPlay = oldPlays.find((p) => p.eventId === play.eventId);
        if (oldPlay) {
            const updatedFields = Object.keys(play).reduce((acc, key) => {
                if (
                    (key as keyof typeof play) &&
                    play[key as keyof typeof play] !== oldPlay[key as keyof typeof play]
                ) {
                    acc[key] = play[key as keyof typeof play];
                }
                return acc;
            }, {} as any);
            return { eventId: play.eventId, ...updatedFields };
        }
        return play;
    });

    const diff = { added, removed, updated };
    // if there are any changes, log the diff to a file (for local run only)
    if (Environment.LOCAL_RUN && any([added.length, updated.length, removed.length])) {
        const { id } = newFeed;
        const outputDir = `./output/${id}`;
        //  create the directory if it doesn't exist
        mkdirSync(outputDir, { recursive: true });
        // write the diff to a file with current timestamp
        const timestamp = new Date().toLocaleTimeString().replace(/:/g, "-");
        const fileName = `${outputDir}/${timestamp}.json`;
        // write the diff to a file
        writeFileSync(fileName, JSON.stringify(diff, null, 2));
    }
    return diff;
};
