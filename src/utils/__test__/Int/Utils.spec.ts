import {PlatformTest} from "@tsed/common";
import {ObjectUtils} from "../../Utils";
import TIME_UNIT from "../../../model/constants/TIME_UNIT";

describe("integration tests", () => {
    beforeEach(PlatformTest.create);
    afterEach(PlatformTest.reset);
    describe("ObjectUtils.convertToMilli()", () => {
        it("should take a number and time unit and return a number of ms", () => {
            expect(
                ObjectUtils.convertToMilli(1,TIME_UNIT.minutes)
            ).toEqual(60000);
        });
    });
});