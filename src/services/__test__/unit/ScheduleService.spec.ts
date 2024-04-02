import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envs, initDotEnv, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { ScheduleService } from "../../ScheduleService.js";
import { ToadScheduler } from "toad-scheduler";

describe("unit tests", () => {
    beforeEach(() => {
        initDotEnv();
        PlatformTest.create({
            envs,
        });
        setUpDataSource();
    });

    afterEach(() => {
        vi.clearAllMocks();
        PlatformTest.reset();
    });

    describe("scheduleCronJob", () => {
        it(
            "should schedule a cron job",
            PlatformTest.inject([ScheduleService], async (scheduleService: ScheduleService) => {
                // given
                // when
                await scheduleService.getAllDateJobs();
                // then
            }),
        );
    });

    describe("scheduleJobInterval", () => {
        it(
            "should schedule a job at a given interval",
            PlatformTest.inject([ScheduleService], async (scheduleService: ScheduleService) => {
                // given
                // when
                await scheduleService.getAllDateJobs();
                // then
            }),
        );
    });

    describe("scheduleJobAtDate", () => {
        it(
            "should schedule a job at a given date",
            PlatformTest.inject([ScheduleService], async (scheduleService: ScheduleService) => {
                // given
                // when
                await scheduleService.getAllDateJobs();
                // then
            }),
        );
    });

    describe("getAllIntervalJobs", () => {
        it(
            "should return all scheduled interval jobs",
            PlatformTest.inject([ScheduleService], async (scheduleService: ScheduleService) => {
                // given
                // when
                await scheduleService.getAllDateJobs();
                // then
            }),
        );
    });

    describe("getAllDateJobs", () => {
        it(
            "should return all scheduled date jobs",
            PlatformTest.inject([ScheduleService], async (scheduleService: ScheduleService) => {
                // given
                // when
                await scheduleService.getAllDateJobs();
                // then
            }),
        );
    });

    describe("scheduleIntervalEngine", () => {
        it(
            "should return the interval scheduler",
            PlatformTest.inject([ScheduleService], () => {
                // when
                const scheduler = ScheduleService.scheduleIntervalEngine;
                // then
                expect(scheduler).toBeInstanceOf(ToadScheduler);
            }),
        );
    });
});
