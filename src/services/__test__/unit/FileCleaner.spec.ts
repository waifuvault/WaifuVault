import { PlatformTest } from "@tsed/common";
import { FileCleaner } from "../../FileCleaner.js";
import { FileRepo } from "../../../db/repo/FileRepo.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleService } from "../../ScheduleService.js";
import { FileService } from "../../FileService.js";
import { envs, initDotEnv, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import {
    fileUploadModelMock500MB,
    fileUploadModelMockCustomExpire,
    fileUploadModelMockExpired,
    fileUploadModelMockExpired2,
    getAllFileUploadMocks,
} from "../../../model/db/__test__/mocks/FileUploadModel.mock.js";

describe("unit tests", () => {
    beforeEach(() => {
        const mockScheduleService = {
            scheduleJobInterval: vi.fn(),
        };

        PlatformTest.create({
            imports: [
                {
                    token: ScheduleService,
                    use: mockScheduleService,
                },
            ],
            envs,
        });
        setUpDataSource();
        initDotEnv();
    });

    afterEach(PlatformTest.reset);

    describe("processFiles", () => {
        it(
            "should process expired Files with success",
            PlatformTest.inject(
                [FileRepo, FileService, FileCleaner],
                async (fileRepo: FileRepo, fileService: FileService, fileCleaner: FileCleaner) => {
                    // given
                    vi.spyOn(fileRepo, "getAllEntries").mockResolvedValue([fileUploadModelMockExpired2]);
                    const processDeleteSpy = vi.spyOn(fileService, "processDelete").mockResolvedValue(true);

                    // when
                    await fileCleaner.processFiles();

                    // then
                    expect(processDeleteSpy).toBeCalledWith([fileUploadModelMockExpired2.token]);
                },
            ),
        );

        it(
            "should not process in date files",
            PlatformTest.inject(
                [FileRepo, FileService, FileCleaner],
                async (fileRepo: FileRepo, fileService: FileService, fileCleaner: FileCleaner) => {
                    // given
                    vi.spyOn(fileRepo, "getAllEntries").mockResolvedValue([
                        fileUploadModelMock500MB,
                        fileUploadModelMockCustomExpire,
                    ]);
                    const processDeleteSpy = vi.spyOn(fileService, "processDelete");

                    // when
                    await fileCleaner.processFiles();

                    // then
                    expect(processDeleteSpy).not.toHaveBeenCalled();
                },
            ),
        );

        it(
            "should filter out only non-expired files",
            PlatformTest.inject(
                [FileRepo, FileService, FileCleaner],
                async (fileRepo: FileRepo, fileService: FileService, fileCleaner: FileCleaner) => {
                    // given
                    vi.spyOn(fileRepo, "getAllEntries").mockResolvedValue(getAllFileUploadMocks());
                    const processDeleteSpy = vi.spyOn(fileService, "processDelete").mockResolvedValue(true);

                    // when
                    await fileCleaner.processFiles();

                    // then
                    expect(processDeleteSpy).toBeCalledWith([
                        fileUploadModelMockExpired.token,
                        fileUploadModelMockExpired2.token,
                    ]);
                },
            ),
        );
    });
});
