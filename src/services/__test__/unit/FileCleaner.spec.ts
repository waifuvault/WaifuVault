import {PlatformTest} from "@tsed/common";
import {FileCleaner} from "../../FileCleaner.js";
import {FileRepo} from "../../../db/repo/FileRepo.js";
import {jest} from '@jest/globals';
import {ScheduleService} from "../../ScheduleService.js";
import {fileUploadModelMock1} from "../mocks/FileUploadModel.mock.js";
import {FileService} from "../../FileService.js";
import {initDotEnv, setUpDataSource} from "../../../__test__/testUtils.spec";

describe("unit tests", () => {

    beforeEach(() => {

        const mockScheduleService = {
            scheduleJobInterval: jest.fn()
        };

        jest.mock("../../ScheduleService.ts", () => {
            return {
                ScheduleService: jest.fn().mockImplementation(() => mockScheduleService),
            };
        });

        PlatformTest.create({
            imports: [
                {
                    token: ScheduleService,
                    use: mockScheduleService
                }
            ],
        });
        setUpDataSource();
        initDotEnv();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterEach(PlatformTest.reset);

    describe("processFiles", () => {
        it("should processFiles with success", PlatformTest.inject([
            FileRepo,
            FileService,
            FileCleaner
        ], async (
            fileRepo: FileRepo,
            fileService: FileService,
            fileCleaner: FileCleaner
        ) => {
            // given
            jest.spyOn(fileRepo, "getAllEntries").mockResolvedValue([fileUploadModelMock1]);
            const processDeleteSpy = jest.spyOn(fileService, "processDelete").mockResolvedValue(true);

            // when
            await fileCleaner.processFiles();

            // then
            expect(processDeleteSpy).toHaveBeenNthCalledWith(1, fileUploadModelMock1.token);
        }));
    });
});
