import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformCreate } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { ScheduleService } from "../../ScheduleService.js";
import { Job, ToadScheduler } from "toad-scheduler";

describe("unit tests", () => {
    beforeEach(async () => {
        await platformCreate();
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
                scheduleService.scheduleCronJob(cronval, async () => {}, "testJob", false);
                // then
                const job = scheduleService.scheduleIntervalEngine.getById("testJob");
                expect(job).toBeInstanceOf(Job);
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
