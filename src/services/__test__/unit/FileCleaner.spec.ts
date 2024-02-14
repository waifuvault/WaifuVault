import {PlatformTest} from "@tsed/common";
import {FileCleaner} from "../../FileCleaner";
import {SQLITE_DATA_SOURCE} from "../../../model/di/tokens";
import {FileRepo} from "../../../db/repo/FileRepo";
import {jest} from '@jest/globals';
import {ScheduleService} from "../../ScheduleService";
import {fileUploadModelMock1} from "../mocks/FileUploadModel.mock";
import {FileService} from "../../FileService";

describe("unit tests", () => {
    beforeEach(() => {
        PlatformTest.create({
            imports: [
                {
                    token: ScheduleService,
                    use: {
                        scheduleJobInterval: (): void => {

                        }
                    }
                }
            ],
        });
        PlatformTest.injector.addProvider(SQLITE_DATA_SOURCE, {
            provide: SQLITE_DATA_SOURCE,
            type: "typeorm:datasource",
            useValue: {
                getRepository: () => {
                    return null;
                }
            }
        });
        process.env.FILE_SIZE_UPLOAD_LIMIT_MB = "512";
    });
    afterEach(PlatformTest.reset);

    describe("with inject()", () => {
        it("should do something", async () => {
            const fileRepo = PlatformTest.get(FileRepo);
            jest.spyOn(fileRepo, "getAllEntries").mockResolvedValue(Promise.resolve([fileUploadModelMock1]));

            const fileService: FileService = PlatformTest.get(FileService);
            const processDeleteSpy = jest.spyOn(fileService, "processDelete").mockResolvedValue(true);

            const instance: FileCleaner = await PlatformTest.invoke(FileCleaner);
            await instance.processFiles();
            expect(processDeleteSpy).toHaveBeenNthCalledWith(1, fileUploadModelMock1.token);
        });
    });
});
