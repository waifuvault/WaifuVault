import {PlatformTest} from "@tsed/common";
import {ObjectUtils} from "../../Utils";
import TIME_UNIT from "../../../model/constants/TIME_UNIT";

describe("unit tests", () => {
    beforeEach(PlatformTest.create);
    afterEach(PlatformTest.reset);
    describe("ObjectUtils.getNumber()", () => {
        it("should take a string and return a number", () => {
            expect(
                ObjectUtils.getNumber("123")
            ).toEqual(123);
        });
    });

    describe("ObjectUtils.timeToHuman()", () => {
        it("should take number of MS and return a human readable string", () => {
            expect(
                ObjectUtils.timeToHuman(3661 * 1000)
            ).toEqual("1 hour 1 minute 1 second");
        });
    });

    describe("ObjectUtils.convertToMilli()", () => {
        it("should take a number and time unit and return a number of ms", () => {
            expect(
                ObjectUtils.convertToMilli(1,TIME_UNIT.minutes)
            ).toEqual(60000);
        });
    });
});