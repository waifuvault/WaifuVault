import {jest} from '@jest/globals';
import {PlatformTest} from "@tsed/common";
import {envs, initDotEnv, setUpDataSource} from "../../../__test__/testUtils.spec.js";
import {MimeService} from "../../MimeService.js";

// attempting to mock fileTypeFromFile
import * as fileType from "file-type";

// this just gets the error "TypeError: Cannot assign to read only property 'fileTypeFromFile' of object '[object Module]'"
jest.spyOn(fileType, 'fileTypeFromFile').mockResolvedValue({
    mime: "application/avro",
    ext: "exe"
});

// this just does nothing inside of `MimeService` the function is still the real one
jest.mock("file-type", () => {
    return {
        fileTypeFromFile: jest.fn(() => true)
    };
});

// this does fuck all
jest.mock("file-type", () => {
    const os = jest.requireActual('file-type');
    jest.spyOn(os, 'fileTypeFromFile').mockReturnValue(true);
    return {
        fileTypeFromFile: jest.fn(() => true)
    };
});

// i can not figure out how to mock 3rd-paty modules inside of modules

describe("unit tests", () => {

    const file = "fakeFile.exe";

    beforeEach(() => {
        initDotEnv();
        PlatformTest.create({
            envs
        });
        setUpDataSource();
    });

    afterEach(PlatformTest.reset);

    describe("isBlocked", () => {
        it("should return blocked for a mocked filepath", PlatformTest.inject([
            MimeService
        ], async (
            mimeService: MimeService
        ) => {

            await mimeService.isBlocked(file);
        }));
    });
});
