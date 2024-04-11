import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformCreate } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { FileService } from "../../FileService.js";
import { FileRepo } from "../../../db/repo/FileRepo.js";
import {
    fileUploadModelMock500MB,
    fileUploadModelMock500MBProtected,
    fileUploadModelMockCustomExpire,
    fileUploadModelMockExpired,
} from "../../../model/db/__test__/mocks/FileUploadModel.mock.js";
import { FileUploadResponseDto } from "../../../model/dto/FileUploadResponseDto";
import { FileUtils } from "../../../utils/Utils";
import { RecordInfoSocket } from "../../socket/RecordInfoSocket";
import { EncryptionService } from "../../EncryptionService";

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
            "should throw resource not found exception for missing entry",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi.spyOn(fileRepo, "getEntryFileName").mockResolvedValue(null);

                // when
                await expect(fileService.getEntry("somefilename")).rejects.toThrow(
                    "resource somefilename is not found",
                );

                // then
                expect(fileSpy).toHaveBeenCalledWith("somefilename");
            }),
        );

        it(
            "should throw resource not found exception for expired entry",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi.spyOn(fileRepo, "getEntryFileName").mockResolvedValue(fileUploadModelMockExpired);

                // when
                await expect(fileService.getEntry("somefilename")).rejects.toThrow(
                    "resource somefilename is not found",
                );

                // then
                expect(fileSpy).toHaveBeenCalledWith("somefilename");
            }),
        );

        it(
            "should call decrypt entry and return a buffer and file upload model",
            PlatformTest.inject(
                [FileService, FileRepo, EncryptionService],
                async (fileService: FileService, fileRepo: FileRepo, encryptionService: EncryptionService) => {
                    // given
                    const fileSpy = vi
                        .spyOn(fileRepo, "getEntryFileName")
                        .mockResolvedValue(fileUploadModelMock500MBProtected);
                    const encSpy = vi.spyOn(encryptionService, "decrypt").mockResolvedValue(Buffer.from([10, 10, 10]));

                    // when
                    const entry = await fileService.getEntry(
                        fileUploadModelMock500MBProtected.originalFileName,
                        fileUploadModelMock500MBProtected.originalFileName,
                        "somepassword",
                    );

                    // then
                    expect(fileSpy).toHaveBeenCalledWith(fileUploadModelMock500MBProtected.originalFileName);
                    expect(encSpy).toHaveBeenCalledWith(fileUploadModelMock500MBProtected, "somepassword");
                    expect(entry).toEqual([Buffer.from([10, 10, 10]), fileUploadModelMock500MBProtected]);
                },
            ),
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
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi.spyOn(fileRepo, "getEntry").mockResolvedValue([fileUploadModelMock500MB]);

                // when
                const retval = await fileService.getFileInfo("sometoken", true);

                // then
                expect(fileSpy).toHaveBeenCalledWith(["sometoken"]);
                expect(retval).toBeInstanceOf(FileUploadResponseDto);
                expect(retval.token).toBe("cdbe690b-552c-4533-a7e9-5802ef4b2f1b");
            }),
        );

        it(
            "should throw exception for missing token",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi.spyOn(fileRepo, "getEntry").mockResolvedValue([]);

                // when
                await expect(fileService.getFileInfo("sometoken", true)).rejects.toThrow("Unknown token sometoken");

                // then
                expect(fileSpy).toHaveBeenCalledWith(["sometoken"]);
            }),
        );

        it(
            "should throw exception for expired token",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi.spyOn(fileRepo, "getEntry").mockResolvedValue([fileUploadModelMockExpired]);
                const delSpy = vi.spyOn(fileService, "processDelete").mockResolvedValue(true);
                // when
                await expect(fileService.getFileInfo("sometoken", true)).rejects.toThrow("Unknown token sometoken");

                // then
                expect(fileSpy).toHaveBeenCalledWith(["sometoken"]);
                expect(delSpy).toHaveBeenCalledWith(["cdbe690b-552c-4533-a7e9-5802ef4b2f1d"], true);
            }),
        );
    });

    describe("processDelete", () => {
        it(
            "should delete the files for a given list of tokens",
            PlatformTest.inject(
                [FileService, FileRepo, RecordInfoSocket],
                async (fileService: FileService, fileRepo: FileRepo, recordSocketInfo: RecordInfoSocket) => {
                    // given
                    const fileSpy = vi
                        .spyOn(fileRepo, "getEntry")
                        .mockResolvedValue([fileUploadModelMock500MB, fileUploadModelMockCustomExpire]);
                    const delSpy = vi.spyOn(FileUtils, "deleteFile").mockResolvedValue();
                    const delEntSpy = vi.spyOn(fileRepo, "deleteEntries").mockResolvedValue(true);
                    vi.spyOn(recordSocketInfo, "emit").mockResolvedValue(true);

                    // when
                    const retval = await fileService.processDelete(["sometoken1", "sometoken2"]);

                    // then
                    expect(fileSpy).toHaveBeenCalledWith(["sometoken1", "sometoken2"]);
                    expect(delSpy).toHaveBeenNthCalledWith(1, fileUploadModelMock500MB.fullFileNameOnSystem, true);
                    expect(delSpy).toHaveBeenNthCalledWith(
                        2,
                        fileUploadModelMockCustomExpire.fullFileNameOnSystem,
                        true,
                    );
                    expect(delEntSpy).toHaveBeenCalledWith(["sometoken1", "sometoken2"]);
                    expect(retval).toBe(true);
                },
            ),
        );

        it(
            "should return false for no files found",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi.spyOn(fileRepo, "getEntry").mockResolvedValue([]);
                const delSpy = vi.spyOn(FileUtils, "deleteFile").mockResolvedValue();
                const delEntSpy = vi.spyOn(fileRepo, "deleteEntries").mockResolvedValue(true);

                // when
                const retval = await fileService.processDelete(["sometoken1", "sometoken2"]);

                // then
                expect(fileSpy).toHaveBeenCalledWith(["sometoken1", "sometoken2"]);
                expect(delSpy).not.toHaveBeenCalled();
                expect(delEntSpy).not.toHaveBeenCalled();
                expect(retval).toBe(false);
            }),
        );

        it(
            "should return false for expired entry on soft delete",
            PlatformTest.inject([FileService, FileRepo], async (fileService: FileService, fileRepo: FileRepo) => {
                // given
                const fileSpy = vi
                    .spyOn(fileRepo, "getEntry")
                    .mockResolvedValue([fileUploadModelMock500MB, fileUploadModelMockExpired]);
                const delSpy = vi.spyOn(FileUtils, "deleteFile").mockResolvedValue();
                const delEntSpy = vi.spyOn(fileRepo, "deleteEntries").mockResolvedValue(true);

                // when
                const retval = await fileService.processDelete(["sometoken1", "sometoken2"], true);

                // then
                expect(fileSpy).toHaveBeenCalledWith(["sometoken1", "sometoken2"]);
                expect(delSpy).toHaveBeenNthCalledWith(1, fileUploadModelMock500MB.fullFileNameOnSystem, true);
                expect(delSpy).toHaveBeenNthCalledWith(2, fileUploadModelMockExpired.fullFileNameOnSystem, true);
                expect(delEntSpy).not.toHaveBeenCalled();
                expect(retval).toBe(false);
            }),
        );
    });
});
