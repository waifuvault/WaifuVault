import { PlatformTest } from "@tsed/common";
import { filesDir, FileUtils, NetworkUtils, ObjectUtils } from "../../Utils.js";
import { initDotEnv } from "../../../__test__/testUtils.spec.js";
import {
    requestMockIpv4WithPort,
    requestMockIpv6WithPort,
    requestMockStandardIpv4,
} from "../../../__test__/mocks/global/Request.mock.js";
import {
    fileUploadModelMock500MB,
    fileUploadModelMockCustomExpire,
    fileUploadModelMockExpired,
} from "../../../model/db/__test__/mocks/FileUploadModel.mock.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TimeUnit from "../../../model/constants/TimeUnit.js";
import process from "node:process";
import fs from "node:fs/promises";
import path from "node:path";

describe("unit tests", () => {
    beforeEach(() => {
        PlatformTest.create();
        initDotEnv();
    });
    afterEach(() => {
        vi.clearAllMocks();
        PlatformTest.reset();
    });

    describe("ObjectUtils", () => {
        describe("getNumber", () => {
            it("should take a string and return a number", () => {
                expect(ObjectUtils.getNumber("123")).toEqual(123);
            });
        });

        describe("timeToHuman", () => {
            describe.each([
                {
                    testName: "3661000 MS",
                    value: 3661 * 1000,
                    timeUnit: TimeUnit.milliseconds,
                    expected: "1 hour 1 minute 1 second",
                },
                {
                    testName: "23 Seconds",
                    value: 23,
                    timeUnit: TimeUnit.seconds,
                    expected: "23 seconds",
                },
                {
                    testName: "128 minutes",
                    value: 128,
                    timeUnit: TimeUnit.minutes,
                    expected: "2 hours 8 minutes",
                },
                {
                    testName: "60 hours",
                    value: 60,
                    timeUnit: TimeUnit.hours,
                    expected: "2 days 12 hours",
                },
                {
                    testName: "128 days",
                    value: 128,
                    timeUnit: TimeUnit.days,
                    expected: "128 days",
                },
                {
                    testName: "14 days",
                    value: 2,
                    timeUnit: TimeUnit.weeks,
                    expected: "14 days",
                },
                {
                    testName: "2 months",
                    value: 2,
                    timeUnit: TimeUnit.months,
                    expected: "60 days 21 hours",
                },
                {
                    testName: "2 years",
                    value: 2,
                    timeUnit: TimeUnit.years,
                    expected: "2 years 11 hours 38 minutes 24 seconds",
                },
                {
                    testName: "2 decades",
                    value: 2,
                    timeUnit: TimeUnit.decades,
                    expected: "20 years 4 days 20 hours 24 minutes",
                },
            ])("should take number and return a human readable string", ({ value, timeUnit, expected, testName }) => {
                it(testName, () => {
                    expect(ObjectUtils.timeToHuman(value, timeUnit)).toBe(expected);
                });
            });
        });

        describe("sizeToHuman", () => {
            describe.each([
                {
                    testName: "100 Bytes",
                    value: 100,
                    expected: "100 B",
                },
                {
                    testName: "100 Kilobytes",
                    value: 100 * 1024,
                    expected: "100 KB",
                },
                {
                    testName: "100 Megabytes",
                    value: 100 * 1024 * 1024,
                    expected: "100 MB",
                },
                {
                    testName: "100 Gigabytes",
                    value: 100 * 1024 * 1024 * 1024,
                    expected: "100 GB",
                },
            ])("should take number of bytes and return a human readable string", ({ value, expected, testName }) => {
                it(testName, () => {
                    expect(ObjectUtils.sizeToHuman(value)).toBe(expected);
                });
            });
        });

        describe("convertToMilli", () => {
            it("should take a number and time unit and return a number of ms", () => {
                expect(ObjectUtils.convertToMilli(1, TimeUnit.minutes)).toEqual(60000);
            });
            it("should take a number and time unit and return a number of s", () => {
                expect(ObjectUtils.convertToMilli(1, TimeUnit.seconds)).toEqual(1000);
            });
        });

        describe("removeObjectFromArray", () => {
            let arr: number[];

            beforeEach(() => {
                arr = [1, 2, 23];
            });

            it("should remove 2 elements from array", () => {
                ObjectUtils.removeObjectFromArray(arr, itm => itm === 1 || itm === 2);
                expect(arr).toHaveLength(1);
            });

            it("should remove 1 element from array", () => {
                ObjectUtils.removeObjectFromArray(arr, itm => itm === 1);
                expect(arr).toHaveLength(2);
            });
        });
    });

    describe("FileUtils", () => {
        describe("getExtension", () => {
            it("should take a filename and return its extension", () => {
                expect(FileUtils.getExtension("/some/path/to/filename.ext")).toEqual("ext");
            });
        });

        describe("getTimeLeftBySize", () => {
            const FILE_SIZE_500MB = 500 * 1024 * 1024;
            const FILE_SIZE_10MB = 10 * 1024 * 1024;
            const EXPIRATION_300DAY = 300 * 24 * 60 * 60 * 1000;
            const EXPIRATION_30DAY = 30 * 24 * 60 * 60 * 1000;
            it("should take a low filesize and return close to max time", () => {
                expect(FileUtils.getTimeLeftBySize(FILE_SIZE_10MB)).toBeGreaterThan(EXPIRATION_300DAY);
            });
            it("should take a max filesize and return min time", () => {
                expect(FileUtils.getTimeLeftBySize(FILE_SIZE_500MB)).toEqual(EXPIRATION_30DAY);
            });
        });

        describe("getExpiresBySize", () => {
            const FILE_SIZE_500MB = 500 * 1024 * 1024;
            const FILE_SIZE_10MB = 10 * 1024 * 1024;
            const EXPIRATION_300DAY = 300 * 24 * 60 * 60 * 1000;
            const EXPIRATION_30DAY = 30 * 24 * 60 * 60 * 1000;
            const DATE_EPOCH = Date.now();
            it("should take a low filesize and date then return date plus close to max time", () => {
                expect(FileUtils.getExpiresBySize(FILE_SIZE_10MB, DATE_EPOCH)).toBeGreaterThan(
                    DATE_EPOCH + EXPIRATION_300DAY,
                );
            });
            it("should take a max filesize and date then return date plus min time", () => {
                expect(FileUtils.getExpiresBySize(FILE_SIZE_500MB, DATE_EPOCH)).toEqual(DATE_EPOCH + EXPIRATION_30DAY);
            });
        });

        describe("isFileExpired", () => {
            it("should take an expired fileupload and return true for expired", () => {
                expect(FileUtils.isFileExpired(fileUploadModelMockExpired)).toEqual(true);
            });
            it("should take a normal fileupload and return false for expired", () => {
                expect(FileUtils.isFileExpired(fileUploadModelMockCustomExpire)).toEqual(false);
            });
        });

        describe("getTImeLeft", () => {
            const TIME_LEFT_10DAYS = 10 * 24 * 60 * 60 * 1000;
            const TIME_LEFT_30DAYS = 30 * 24 * 60 * 60 * 1000;
            it("should take a normal expire fileupload and return slightly less than thirty days as millis", () => {
                expect(FileUtils.getTImeLeft(fileUploadModelMock500MB) ?? 0).toBeLessThanOrEqual(TIME_LEFT_30DAYS);
            });
            it("should take a custom expire fileupload and return slightly less than ten days as millis", () => {
                expect(FileUtils.getTImeLeft(fileUploadModelMockCustomExpire) ?? 0).toBeLessThanOrEqual(
                    TIME_LEFT_10DAYS,
                );
            });
            it("should take an expired fileupload and return 0 or less time left", () => {
                expect(FileUtils.getTImeLeft(fileUploadModelMockExpired) ?? 0).toBeLessThanOrEqual(0);
            });
        });

        describe("getFilePath", () => {
            describe.each([
                {
                    testName: "String",
                    value: "bar.png",
                    expected: `${path.sep}bar.png`,
                },
                {
                    testName: "UploadModel",
                    value: fileUploadModelMock500MB,
                    expected: `${path.sep}${fileUploadModelMock500MB.fileName}.${fileUploadModelMock500MB.fileExtension}`,
                },
            ])("should take a file, entry or string and return a filepath", ({ value, expected, testName }) => {
                it(testName, () => {
                    expect(FileUtils.getFilePath(value)).toBe(`${filesDir}${expected}`);
                });
            });
        });

        describe("deleteFile", () => {
            it("should take a filename and force setting and call rm with them", () => {
                vi.mock("node:fs/promises", () => {
                    return {
                        default: {
                            rm: vi.fn().mockReturnValue(Promise.resolve()),
                        },
                    };
                });
                const file = "test.png";
                FileUtils.deleteFile(file, false);
                expect(fs.rm).toHaveBeenCalledWith(`${filesDir}/${file}`, { recursive: true, force: false });
            });
        });
    });

    describe("NetworkUtils", () => {
        describe("getIp", () => {
            it("should take a request and return the ip", () => {
                expect(NetworkUtils.getIp(requestMockStandardIpv4)).toEqual("192.168.2.2");
            });
            it("should take a request with ipv6 with a port and strip port", () => {
                expect(NetworkUtils.getIp(requestMockIpv6WithPort)).toEqual("2001:470:30:84:e276:63ff:fe62");
            });
            it("should take a cloudflare request and return the ip", () => {
                process.env.USE_CLOUDFLARE = "true";
                expect(NetworkUtils.getIp(requestMockStandardIpv4)).toEqual("192.168.2.3");
            });
            it("should take a ip with port and strip port", () => {
                expect(NetworkUtils.getIp(requestMockIpv4WithPort)).toEqual("192.168.2.2");
            });
        });
    });
});
