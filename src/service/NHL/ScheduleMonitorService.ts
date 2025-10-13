import { GameScheduleMonitor } from "./tasks/GameScheduleMonitor";

class ScheduleMonitorService {
    private monitor: GameScheduleMonitor | null = null;

    public set(monitor: GameScheduleMonitor): void {
        this.monitor = monitor;
    }

    public get(): GameScheduleMonitor | null {
        return this.monitor;
    }
}

// Export singleton instance
export const scheduleMonitorService = new ScheduleMonitorService();