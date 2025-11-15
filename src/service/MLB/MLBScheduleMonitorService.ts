import { MLBGameScheduleMonitor } from "./tasks/MLBGameScheduleMonitor";

// TODO - consider combining with NHL ScheduleMonitorService
class MLBScheduleMonitorService {
    private monitor?: MLBGameScheduleMonitor;

    set(monitor: MLBGameScheduleMonitor): void {
        this.monitor = monitor;
    }

    get(): MLBGameScheduleMonitor | undefined {
        return this.monitor;
    }
}

export const mlbScheduleMonitorService = new MLBScheduleMonitorService();
