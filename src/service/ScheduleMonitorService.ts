import { MLBGameScheduleMonitor } from "./MLB/tasks/MLBGameScheduleMonitor";
import { NHLGameScheduleMonitor } from "./NHL/tasks/NHLGameScheduleMonitor";
import { PWHLGameScheduleMonitor } from "./PWHL/tasks/PWHLGameScheduleMonitor";

export class ScheduleMonitorService<T> {
	private monitor?: T;

	set(monitor: T): void {
		this.monitor = monitor;
	}

	get(): T | undefined {
		return this.monitor;
	}
}

// Singleton instances
export const nhlScheduleMonitorService = new ScheduleMonitorService<NHLGameScheduleMonitor>();
export const mlbScheduleMonitorService = new ScheduleMonitorService<MLBGameScheduleMonitor>();
export const pwhlScheduleMonitorService = new ScheduleMonitorService<PWHLGameScheduleMonitor>();
