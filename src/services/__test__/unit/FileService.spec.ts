import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformCreate } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { FileService } from "../../FileService.js";
import { FileRepo } from "../../../db/repo/FileRepo.js";
import {
    fileUploadModelMock500MB,
    fileUploadModelMock500MBProtected,
} from "../../../model/db/__test__/mocks/FileUploadModel.mock.js";

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
            "should return true for an encrypted file",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi
                    .spyOn(fileRepo, "getEntryFileName")
                    .mockResolvedValue(fileUploadModelMock500MBProtected);

                // when
                const retval = await fileService.isFileEncrypted("sometoken");

                // then
                expect(fileSpy).toHaveBeenCalledWith("sometoken");
                expect(retval).toBe(true);
            }),
        );

        it(
            "should return false for a normal file",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi.spyOn(fileRepo, "getEntryFileName").mockResolvedValue(fileUploadModelMock500MB);

                // when
                const retval = await fileService.isFileEncrypted("sometoken");

                // then
                expect(fileSpy).toHaveBeenCalledWith("sometoken");
                expect(retval).toBe(false);
            }),
        );

        it(
            "should return false for a missing file",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi.spyOn(fileRepo, "getEntryFileName").mockResolvedValue(null);

                // when
                const retval = await fileService.isFileEncrypted("sometoken");

                // then
                expect(fileSpy).toHaveBeenCalledWith("sometoken");
                expect(retval).toBe(false);
            }),
        );
    });

    describe("requiresPassword", () => {
        it(
            "should return true for a file with a password",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi
                    .spyOn(fileRepo, "getEntryFileName")
                    .mockResolvedValue(fileUploadModelMock500MBProtected);

                // when
                const retval = await fileService.requiresPassword("sometoken");

                // then
                expect(fileSpy).toHaveBeenCalledWith("sometoken");
                expect(retval).toBe(true);
            }),
        );

        it(
            "should return false for a file without a password",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi.spyOn(fileRepo, "getEntryFileName").mockResolvedValue(fileUploadModelMock500MB);

                // when
                const retval = await fileService.requiresPassword("sometoken");

                // then
                expect(fileSpy).toHaveBeenCalledWith("sometoken");
                expect(retval).toBe(false);
            }),
        );

        it(
            "should return false for a missing file",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi.spyOn(fileRepo, "getEntryFileName").mockResolvedValue(null);

                // when
                const retval = await fileService.requiresPassword("sometoken");

                // then
                expect(fileSpy).toHaveBeenCalledWith("sometoken");
                expect(retval).toBe(false);
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
