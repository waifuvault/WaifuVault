import {Inject, Service} from "@tsed/di";
import {Job, SimpleIntervalJob, ToadScheduler} from "toad-scheduler";
import {SimpleIntervalSchedule} from "toad-scheduler/dist/lib/engines/simple-interval/SimpleIntervalSchedule";
import {AsyncTask} from "toad-scheduler/dist/lib/common/AsyncTask";
import schedule, {Job as DateJob, JobCallback} from "node-schedule";
import {Logger} from "@tsed/logger";
import {ObjectUtils} from "../utils/Utils";

@Service()
export class ScheduleService {

    private static readonly scheduler = new ToadScheduler();

    private static readonly dateSchedules: DateJob[] = [];

    @Inject()
    private logger: Logger;

    public scheduleJobInterval<T>(schedule: SimpleIntervalSchedule, jobHandler: (this: T) => Promise<void>, jobName: string, context: T): void {
        jobHandler = jobHandler.bind(context);
        const task = new AsyncTask(
            jobName,
            jobHandler
        );
        const job = new SimpleIntervalJob(schedule, task, {
            id: jobName
        });
        ScheduleService.scheduler.addSimpleIntervalJob(job);
        this.logger.info(`Registered interval job ${jobName}`);
    }

    public scheduleJobAtDate<T>(name: string, when: Date, jobHandler: JobCallback, context: T): void {
        if (when.getTime() < Date.now()) {
            this.logger.warn(`Unable to schedule job "${name}" as the date (${when.toUTCString()}) is before now`);
            return;
        }
        jobHandler = jobHandler.bind(context);
        const job = schedule.scheduleJob(name, when, (fireDate: Date) => {
            jobHandler.call(context, fireDate);
            ObjectUtils.removeObjectFromArray(ScheduleService.dateSchedules, itm => itm === job);
        });
        ScheduleService.dateSchedules.push(job);
        this.logger.info(`Registered date job ${name} to run on ${when.toUTCString()}`);
    }

    public getAllIntervalJobs(): Job[] {
        return ScheduleService.scheduler.getAllJobs();
    }

    public getAllDateJobs(): DateJob[] {
        return ScheduleService.dateSchedules;
    }
}
