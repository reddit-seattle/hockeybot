import { Environment } from "./constants";

// TODO - its own module
export class Logger {
    static info(message: string, ...optionalParams: any[]) {
        console.info(`[INFO] ${new Date().toISOString()} - ${message}`, ...optionalParams);
    }

    static warn(message: string, ...optionalParams: any[]) {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...optionalParams);
    }

    static error(message: string, ...optionalParams: any[]) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...optionalParams);
    }

    static debug(message: string, ...optionalParams: any[]) {
        if (Environment.LOCAL_RUN) {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...optionalParams);
        }
    }
}