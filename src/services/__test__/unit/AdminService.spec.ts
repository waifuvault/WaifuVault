import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformCreate, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { FileRepo } from "../../../db/repo/FileRepo.js";
import { FileService } from "../../FileService.js";
import { AdminService } from "../../AdminService.js";
import { IpBlackListRepo } from "../../../db/repo/IpBlackListRepo.js";
import { Builder } from "builder-pattern";
import { IpBlackListModel } from "../../../model/db/IpBlackList.model.js";
import {
    fileUploadModelMock500MB,
    fileUploadModelMockCustomExpire,
} from "../../../model/db/__test__/mocks/FileUploadModel.mock.js";
import { StatsDto } from "../../../model/dto/StatsDto.js";

describe("unit tests", () => {
    beforeEach(async () => {
        await platformCreate();
        setUpDataSource();
    });

    afterEach(async () => {
        vi.clearAllMocks();
        await PlatformTest.reset();
    });

    describe("getStatsData", () => {
        it(
            "should call build stats",
            PlatformTest.inject([AdminService], async (adminService: AdminService) => {
                // given
                const statsSpy = vi.spyOn(StatsDto, "buildStats").mockResolvedValue(Builder(StatsDto).build());

                // when
                await adminService.getStatsData([]);

                // then
                expect(statsSpy).toHaveBeenCalledWith([]);
            }),
        );
    });

    describe("getAllEntries", () => {
        it(
            "should call get all entries and build dto",
            PlatformTest.inject(
                [FileRepo, IpBlackListRepo, AdminService],
                async (fileRepo: FileRepo, ipBlackListRepo: IpBlackListRepo, adminService: AdminService) => {
                    // given
                    const fileSpy = vi
                        .spyOn(fileRepo, "getAllEntries")
                        .mockResolvedValue([fileUploadModelMock500MB, fileUploadModelMockCustomExpire]);
                    vi.spyOn(ipBlackListRepo, "isIpBlocked").mockResolvedValue(false);

                    // when
                    const retval = await adminService.getAllEntries();

                    // then
                    expect(fileSpy).toHaveBeenCalledWith();
                    expect(retval.length).equal(2);
                },
            ),
        );
    });

    describe("getPagedEntries", () => {
        it(
            "should call get all entries ordered and build dto",
            PlatformTest.inject(
                [FileRepo, IpBlackListRepo, AdminService],
                async (fileRepo: FileRepo, ipBlackListRepo: IpBlackListRepo, adminService: AdminService) => {
                    // given
                    const fileSpy = vi
                        .spyOn(fileRepo, "getAllEntriesOrdered")
                        .mockResolvedValue([fileUploadModelMock500MB, fileUploadModelMockCustomExpire]);
                    vi.spyOn(ipBlackListRepo, "isIpBlocked").mockResolvedValue(false);

                    // when
                    const retval = await adminService.getPagedEntries(1, 10, "id", "ASC", "test search");

                    // then
                    expect(fileSpy).toHaveBeenCalledWith(1, 10, "id", "ASC", "test search");
                    expect(retval.length).equal(2);
                },
            ),
        );
    });

    describe("getFileRecordCount", () => {
        it(
            "should return 100",
            PlatformTest.inject([FileRepo, AdminService], async (fileRepo: FileRepo, adminService: AdminService) => {
                // given
                vi.spyOn(fileRepo, "getRecordCount").mockResolvedValue(100);

                // when
                const retval = await adminService.getFileRecordCount();

                // then
                expect(retval).equal(100);
            }),
        );
    });

    describe("getFileSearchRecordCount", () => {
        it(
            "should return 100",
            PlatformTest.inject([FileRepo, AdminService], async (fileRepo: FileRepo, adminService: AdminService) => {
                // given
                vi.spyOn(fileRepo, "getSearchRecordCount").mockResolvedValue(100);

                // when
                const retval = await adminService.getFileSearchRecordCount("searchVal");

                // then
                expect(retval).equal(100);
            }),
        );
    });

    describe("getAllBlockedIps", () => {
        it(
            "should call get all blocked ips",
            PlatformTest.inject(
                [IpBlackListRepo, AdminService],
                async (ipBlacklistRepo: IpBlackListRepo, adminService: AdminService) => {
                    // given
                    const blackListSpy = vi
                        .spyOn(ipBlacklistRepo, "getAllBlockedIps")
                        .mockResolvedValue([
                            Builder(IpBlackListModel).ip("1.1.1.1").build(),
                            Builder(IpBlackListModel).ip("2.2.2.2").build(),
                        ]);

                    // when
                    await adminService.getAllBlockedIps();

                    // then
                    expect(blackListSpy).toHaveBeenCalledWith();
                },
            ),
        );
    });

    describe("blockIp", () => {
        it(
            "should call process ip and not call delete",
            PlatformTest.inject(
                [IpBlackListRepo, FileService, AdminService],
                async (ipBlacklistRepo: IpBlackListRepo, fileService: FileService, adminService: AdminService) => {
                    // given
                    const blackListSpy = vi
                        .spyOn(ipBlacklistRepo, "addIpBlock")
                        .mockResolvedValue(Builder(IpBlackListModel).ip("1.1.1.1").build());
                    const processDeleteSpy = vi.spyOn(fileService, "processDelete");

                    // when
                    await adminService.blockIp("1.1.1.1", false);

                    // then
                    expect(blackListSpy).toHaveBeenCalledWith("1.1.1.1");
                    expect(processDeleteSpy).not.toHaveBeenCalled();
                },
            ),
        );

        it(
            "should call process ip and call delete",
            PlatformTest.inject(
                [FileRepo, IpBlackListRepo, FileService, AdminService],
                async (
                    fileRepo: FileRepo,
                    ipBlacklistRepo: IpBlackListRepo,
                    fileService: FileService,
                    adminService: AdminService,
                ) => {
                    // given
                    const fileRepoSpy = vi
                        .spyOn(fileRepo, "getAllEntriesForIp")
                        .mockResolvedValue([fileUploadModelMock500MB, fileUploadModelMockCustomExpire]);
                    const blackListSpy = vi
                        .spyOn(ipBlacklistRepo, "addIpBlock")
                        .mockResolvedValue(Builder(IpBlackListModel).ip("1.1.1.1").build());
                    const processDeleteSpy = vi.spyOn(fileService, "processDelete").mockResolvedValue(true);

                    // when
                    await adminService.blockIp("1.1.1.1", true);

                    // then
                    expect(fileRepoSpy).toHaveBeenCalled();
                    expect(blackListSpy).toHaveBeenCalledWith("1.1.1.1");
                    expect(processDeleteSpy).toHaveBeenCalledWith([
                        fileUploadModelMock500MB.token,
                        fileUploadModelMockCustomExpire.token,
                    ]);
                },
            ),
        );
    });

    describe("removeBlockedIps", () => {
        it(
            "should call remove blocked ips",
            PlatformTest.inject(
                [IpBlackListRepo, AdminService],
                async (ipBlacklistRepo: IpBlackListRepo, adminService: AdminService) => {
                    // given
                    const blackListSpy = vi.spyOn(ipBlacklistRepo, "removeBlockedIps").mockResolvedValue(true);

                    // when
                    await adminService.removeBlockedIps(["1.1.1.1", "2.2.2.2"]);

                    // then
                    expect(blackListSpy).toHaveBeenCalledWith(["1.1.1.1", "2.2.2.2"]);
                },
            ),
        );
    });

    describe("deleteEntries", () => {
        it(
            "should call delete entries",
            PlatformTest.inject(
                [FileRepo, FileService, AdminService],
                async (fileRepo: FileRepo, fileService: FileService, adminService: AdminService) => {
                    // given
                    const getAllEntriesSpy = vi
                        .spyOn(fileRepo, "getAllEntries")
                        .mockResolvedValue([fileUploadModelMock500MB, fileUploadModelMockCustomExpire]);
                    const processDeleteSpy = vi.spyOn(fileService, "processDelete").mockResolvedValue(true);

                    // when
                    await adminService.deleteEntries([100, 101]);

                    // then
                    expect(getAllEntriesSpy).toHaveBeenCalledWith([100, 101]);
                    expect(processDeleteSpy).toHaveBeenCalledWith([
                        fileUploadModelMock500MB.token,
                        fileUploadModelMockCustomExpire.token,
                    ]);
                },
            ),
        );
    });
});
