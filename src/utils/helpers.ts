import { format } from "date-fns";


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
}

/**
 * Typed "GET" for an API endpoint
 * @param url The API endpoint
 * @returns The JSON response typed as an object of the provided type T.
 */
export async function get<T>(
    url: string
): Promise<T> {
    const response = await fetch(url);
    const body = await response.json();
    return body;
}