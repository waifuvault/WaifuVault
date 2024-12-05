import { $on } from "@tsed/hooks";
import { AsyncTask, CronJob, ToadScheduler } from "toad-scheduler";
import { Logger } from "@tsed/logger";
import { inject } from "@tsed/di";
import cronstrue from "cronstrue";

export const scheduler = new ToadScheduler();

/**
 * Run a task as defined by the supplied crontab
 * @param {string | ((instance: T) => string)} cronExpression - the cron or a function to get the cron
 * @param {boolean} runImmediately - if it should be run instantly
 * @returns {(target: T, propertyKey: string, descriptor: PropertyDescriptor) => void}
 * @constructor
 */
export function RunEvery<T>(
    cronExpression: string | ((instance: T) => string),
    runImmediately = false,
): (target: T, propertyKey: string, descriptor: PropertyDescriptor) => void {
    return function (target: T, propertyKey: string, descriptor: PropertyDescriptor): void {
        $on("$afterInvoke", (target as object).constructor, (instance: T) => {
            if (typeof cronExpression === "function") {
                cronExpression = cronExpression(instance);
            }
            const logger = inject(Logger);
            const jobName = `${(target as object).constructor.name}.${propertyKey}`;
            const task = new AsyncTask(
                jobName,
                () => {
                    return descriptor.value.call(instance);
                },
                err => {
                    logger.error(err);
                },
            );
            const job = new CronJob(
                {
                    cronExpression,
                },
                task,
                {
                    preventOverrun: true,
                },
            );
            scheduler.addCronJob(job);
            const cronExplain = cronstrue.toString(cronExpression);
            logger.info(`Registered cron job ${jobName} to run ${cronExplain}`);
            if (runImmediately) {
                descriptor.value.call(instance);
            }
        });
    };
}
