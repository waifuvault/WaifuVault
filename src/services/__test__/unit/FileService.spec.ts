import { afterEach, beforeEach, describe, it, vi } from "vitest";
import { platformCreate } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { FileService } from "../../FileService.js";

describe("unit tests", () => {
    beforeEach(async () => {
        await platformCreate();
    });

    afterEach(async () => {
        vi.clearAllMocks();
        await PlatformTest.reset();
    });

    describe("processUpload", () => {
        it(
            "should process a given upload",
            PlatformTest.inject([FileService], async (fileService: FileService) => {
                // given

                // when
                await fileService.getFileInfo("sometoken", true);

                // then
            }),
        );
    });

    describe("isFileEncrypted", () => {
        it(
            "should return a bool with encryption state for a given file",
            PlatformTest.inject([FileService], async (fileService: FileService) => {
                // given

                // when
                await fileService.getFileInfo("sometoken", true);

                // then
            }),
        );
    });

    describe("requiresPassword", () => {
        it(
            "should return true if entry requires a password",
            PlatformTest.inject([FileService], async (fileService: FileService) => {
                // given

                // when
                await fileService.getFileInfo("sometoken", true);

                // then
            }),
        );
    });

    describe("getEntry", () => {
        it(
            "should return a decrypted buffer and fileupload model for a given filename",
            PlatformTest.inject([FileService], async (fileService: FileService) => {
                // given

                // when
                await fileService.getFileInfo("sometoken", true);

                // then
            }),
        );
    });

    describe("modifyEntry", () => {
        it(
            "should modify an entry based on a given modification dto and token",
            PlatformTest.inject([FileService], async (fileService: FileService) => {
                // given

                // when
                await fileService.getFileInfo("sometoken", true);

                // then
            }),
        );
    });

    describe("getFileInfo", () => {
        it(
            "should return file information for a given token and human readable bool",
            PlatformTest.inject([FileService], async (fileService: FileService) => {
                // given

                // when
                await fileService.getFileInfo("sometoken", true);

                // then
            }),
        );
    });

    describe("processDelete", () => {
        it(
            "should delete the files for a given list of tokens",
            PlatformTest.inject([FileService], async (fileService: FileService) => {
                // given

                // when
                await fileService.getFileInfo("sometoken", true);

                // then
            }),
        );
    });
});
