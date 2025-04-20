import chalk from "chalk";
import { Environment } from "./constants";

// TODO - its own module
export class Logger {
    static info(message: string, ...optionalParams: any[]) {
        console.info(chalk.white(`[INFO] ${new Date().toISOString()} - ${message}`), ...optionalParams);
    }

    static warn(message: string, ...optionalParams: any[]) {
        console.warn(chalk.yellowBright(`[WARN] ${new Date().toISOString()} - ${message}`), ...optionalParams);
    }

    static error(message: string | unknown, ...optionalParams: any[]) {
        console.error(
            chalk.redBright(`[ERROR] ${new Date().toISOString()} - ${message ?? "Unknown"}`),
            ...optionalParams
        );
    }

    static debug(message: string, ...optionalParams: any[]) {
        if (Environment.LOCAL_RUN) {
            console.debug(chalk.green(`[DEBUG] ${new Date().toISOString()} - ${message}`), ...optionalParams);
        }
    }
}
