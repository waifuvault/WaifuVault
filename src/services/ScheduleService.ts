import { Inject, Service } from "@tsed/di";
import { AsyncTask, CronJob, Job, ToadScheduler } from "toad-scheduler";
import { Logger } from "@tsed/logger";
import cronstrue from "cronstrue";

@Service()
export class ScheduleService {
    public constructor(@Inject() private logger: Logger) {}

    private readonly scheduler = new ToadScheduler();

    public scheduleCronJob(
        cronExpression: string,
        jobHandler: () => Promise<void>,
        jobName: string,
        runImmediately = false,
    ): void {
        const task = new AsyncTask(jobName, jobHandler);
        const job = new CronJob(
            {
                cronExpression,
            },
            task,
            {
                id: jobName,
                preventOverrun: true,
            },
        );
        this.scheduler.addCronJob(job);
        const cronExplain = cronstrue.toString(cronExpression);
        this.logger.info(`Registered cron job ${jobName} to run ${cronExplain}`);
        if (runImmediately) {
            jobHandler();
        }
    }

    public getAllIntervalJobs(): Job[] {
        return this.scheduler.getAllJobs();
    }

    public get scheduleIntervalEngine(): ToadScheduler {
        return this.scheduler;
    }
}
