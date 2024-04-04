import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformCreate, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { ScheduleService } from "../../ScheduleService.js";
import { Job, ToadScheduler } from "toad-scheduler";

describe("unit tests", () => {
    beforeEach(async () => {
        await platformCreate();
        setUpDataSource();
        const sheduleService: ScheduleService = PlatformTest.get(ScheduleService);
        sheduleService.clearAllIntervalJobs();
        sheduleService.clearAllDateJobs();
    });

    afterEach(() => {
        vi.clearAllMocks();
        PlatformTest.reset();
    });

    describe("scheduleCronJob", () => {
        it(
            "should schedule a cron job",
            PlatformTest.inject([ScheduleService], (scheduleService: ScheduleService) => {
                // given
                const now = new Date();
                const cronval = `0 ${(now.getHours() + 1) % 24} * * *`;
                // when
                scheduleService.scheduleCronJob(cronval, async () => {}, "testJob", this, false);
                // then
                const job = scheduleService.scheduleIntervalEngine.getById("testJob");
                expect(job).toBeInstanceOf(Job);
            }),
        );
    });

    describe("scheduleJobInterval", () => {
        it(
            "should schedule a job at a given interval",
            PlatformTest.inject([ScheduleService], (scheduleService: ScheduleService) => {
                // when
                scheduleService.scheduleJobInterval(
                    { hours: 1, runImmediately: false },
                    async () => {},
                    "testInterval",
                    this,
                );
                // then
                const job = scheduleService.scheduleIntervalEngine.getById("testInterval");
                expect(job).toBeInstanceOf(Job);
            }),
        );
    });

    describe("scheduleJobAtDate", () => {
        it(
            "should schedule a job at a given date",
            PlatformTest.inject([ScheduleService], (scheduleService: ScheduleService) => {
                // given
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                // when
                scheduleService.scheduleJobAtDate("testDate", tomorrow, async () => {}, this);
                // then
                const job = scheduleService.getAllDateJobs();
                expect(job.length).toBe(1);
            }),
        );
    });

    describe("getAllIntervalJobs", () => {
        it(
            "should return all scheduled interval jobs",
            PlatformTest.inject([ScheduleService], (scheduleService: ScheduleService) => {
                // when
                scheduleService.scheduleJobInterval(
                    { hours: 1, runImmediately: false },
                    async () => {},
                    "testInterval2",
                    this,
                );
                scheduleService.scheduleJobInterval(
                    { hours: 2, runImmediately: false },
                    async () => {},
                    "testInterval3",
                    this,
                );
                // then
                const job = scheduleService.getAllIntervalJobs();
                expect(job.length).toBe(2);
            }),
        );
    });

    describe("getAllDateJobs", () => {
        it(
            "should return all date jobs",
            PlatformTest.inject([ScheduleService], (scheduleService: ScheduleService) => {
                // given
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                // when
                scheduleService.scheduleJobAtDate("testDate", tomorrow, async () => {}, this);
                scheduleService.scheduleJobAtDate("testDate2", tomorrow, async () => {}, this);
                // then
                const job = scheduleService.getAllDateJobs();
                expect(job.length).toBe(2);
            }),
        );
    });

    describe("scheduleIntervalEngine", () => {
        it(
            "should return the interval scheduler",
            PlatformTest.inject([ScheduleService], (scheduleService: ScheduleService) => {
                // when
                const scheduler = scheduleService.scheduleIntervalEngine;
                // then
                expect(scheduler).toBeInstanceOf(ToadScheduler);
            }),
        );
    });
});
