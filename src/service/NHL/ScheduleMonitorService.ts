import { NHLGameScheduleMonitor } from "./tasks/NHLGameScheduleMonitor";

class ScheduleMonitorService {
    private monitor: NHLGameScheduleMonitor | null = null;

    public set(monitor: NHLGameScheduleMonitor): void {
        this.monitor = monitor;
    }

    public get(): NHLGameScheduleMonitor | null {
        return this.monitor;
    }
}

// Export singleton instance
export const scheduleMonitorService = new ScheduleMonitorService();