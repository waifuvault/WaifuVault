import {PlatformTest} from "@tsed/common";
import {FileUtils, ObjectUtils} from "../../Utils.js";
import TIME_UNIT from "../../../model/constants/TIME_UNIT.js";

describe("unit tests", () => {
    beforeEach(() => {
        PlatformTest.create();
        process.env.FILE_SIZE_UPLOAD_LIMIT_MB = "512";
    });
    afterEach(PlatformTest.reset);

    describe("ObjectUtils", () => {

        describe("getNumber", () => {
            it("should take a string and return a number", () => {
                expect(
                    ObjectUtils.getNumber("123")
                ).toEqual(123);
            });
        });

        describe("timeToHuman", () => {

            describe.each([
                {
                    testName: "3661000 MS",
                    value: 3661 * 1000,
                    timeUnit: TIME_UNIT.milliseconds,
                    expected: "1 hour 1 minute 1 second"
                },
                {
                    testName: "23 Seconds",
                    value: 23,
                    timeUnit: TIME_UNIT.seconds,
                    expected: "23 seconds"
                },
                {
                    testName: "128 minutes",
                    value: 128,
                    timeUnit: TIME_UNIT.minutes,
                    expected: "2 hours 8 minutes"
                },
                {
                    testName: "60 hours",
                    value: 60,
                    timeUnit: TIME_UNIT.hours,
                    expected: "2 days 12 hours"
                },
                {
                    testName: "128 days",
                    value: 128,
                    timeUnit: TIME_UNIT.days,
                    expected: "128 days"
                },
                {
                    testName: "14 days",
                    value: 2,
                    timeUnit: TIME_UNIT.weeks,
                    expected: "14 days"
                },
                {
                    testName: "2 months",
                    value: 2,
                    timeUnit: TIME_UNIT.months,
                    expected: "60 days 21 hours"
                },
                {
                    testName: "2 years",
                    value: 2,
                    timeUnit: TIME_UNIT.years,
                    expected: "2 years 11 hours 38 minutes 24 seconds"
                },
                {
                    testName: "2 decades",
                    value: 2,
                    timeUnit: TIME_UNIT.decades,
                    expected: "20 years 4 days 20 hours 24 minutes"
                }

            ])('should take number and return a human readable string', ({value, timeUnit, expected, testName}) => {
                it(testName, () => {
                    expect(
                        ObjectUtils.timeToHuman(value, timeUnit)
                    ).toBe(expected);
                });
            });

        });

        describe("convertToMilli", () => {
            it("should take a number and time unit and return a number of ms", () => {
                expect(
                    ObjectUtils.convertToMilli(1, TIME_UNIT.minutes)
                ).toEqual(60000);
            });
            it("should take a number and time unit and return a number of s", () => {
                expect(
                    ObjectUtils.convertToMilli(1, TIME_UNIT.seconds)
                ).toEqual(1000);
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
                expect(
                    FileUtils.getExtension("/some/path/to/filename.ext")
                ).toEqual("ext");
            });
        });

        describe("getTimeLeftBySize", () => {
            const FILE_SIZE_500MB = 500 * 1024 * 1024;
            const FILE_SIZE_10MB = 10 * 1024 * 1024;
            const EXPIRATION_300DAY = 300 * 24 * 60 * 60 * 1000;
            const EXPIRATION_30DAY = 30 * 24 * 60 * 60 * 1000;
            it("should take a low filesize and return close to max time", () => {
                expect(
                    FileUtils.getTimeLeftBySize(FILE_SIZE_10MB)
                ).toBeGreaterThan(EXPIRATION_300DAY);
            });
            it("should take a max filesize and return min time", () => {
                expect(
                    FileUtils.getTimeLeftBySize(FILE_SIZE_500MB)
                ).toEqual(EXPIRATION_30DAY);
            });
        });
    });

});
