import chalk from "chalk";
import { Environment } from "./constants";

export class Logger {
	static info(message: string, ...optionalParams: any[]) {
		console.info(chalk.white(`[INFO] ${Logger.timeStamp()} - ${message}`), ...optionalParams);
	}

	static warn(message: string, ...optionalParams: any[]) {
		console.warn(chalk.yellowBright(`[WARN] ${Logger.timeStamp()} - ${message}`), ...optionalParams);
	}

	static error(message: string | unknown, ...optionalParams: any[]) {
		console.error(chalk.redBright(`[ERROR] ${Logger.timeStamp()} - ${message ?? "Unknown"}`), ...optionalParams);
	}

	static debug(message: string, ...optionalParams: any[]) {
		if (Environment.LOCAL_RUN) {
			console.debug(chalk.green(`[DEBUG] ${Logger.timeStamp()} - ${message}`), ...optionalParams);
		}
	}
	private static timeStamp(): string {
		return new Date().toISOString();
	}
}
