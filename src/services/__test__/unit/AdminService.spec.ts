import { afterEach, beforeEach, describe, vi } from "vitest";
import { envs, initDotEnv, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";

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

    describe("getPagedEntries", () => {});
});
