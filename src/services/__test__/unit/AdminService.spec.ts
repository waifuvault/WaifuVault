import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envs, initDotEnv, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { FileRepo } from "../../../db/repo/FileRepo.js";
import { FileService } from "../../FileService.js";
import { AdminService } from "../../AdminService.js";
import { IpBlackListRepo } from "../../../db/repo/IpBlackListRepo.js";
import { Builder } from "builder-pattern";
import { IpBlackListModel } from "../../../model/db/IpBlackList.model";

describe("unit tests", () => {
    beforeEach(() => {
        initDotEnv();
        PlatformTest.create({
            envs,
        });
        setUpDataSource();
    });

    afterEach(() => {
        vi.clearAllMocks();
        PlatformTest.reset();
    });

    describe("getStatsData", () => {
        // Given
        // When
        // Then
    });

    describe("getAllEntries", () => {
        // Given
        // When
        // Then
    });

    describe("getPagedEntries", () => {
        // Given
        // When
        // Then
    });

    describe("buildFileEntryDtos", () => {
        // Given
        // When
        // Then
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

    describe("getAllBlockedIps", () => {});

    describe("blockIp", () => {
        it(
            "should call process ip and not call delete",
            PlatformTest.inject(
                [FileRepo, IpBlackListRepo, FileService, AdminService],
                async (
                    fileRepo: FileRepo,
                    ipBlacklistRepo: IpBlackListRepo,
                    adminService: AdminService,
                    fileService: FileService,
                ) => {
                    // given
                    const blackListSpy = vi
                        .spyOn(ipBlacklistRepo, "addIpBlock")
                        .mockResolvedValue(Builder(IpBlackListModel).ip("1.1.1.1").build());
                    const processDeleteSpy = vi.spyOn(fileService, "processDelete");

                    // when
                    await adminService.blockIp("1.1.1.1", false);

                    // then
                    expect(blackListSpy).toHaveBeenCalled();
                    expect(processDeleteSpy).not.toHaveBeenCalled();
                },
            ),
        );

        it(
            "should call process ip and call delete",
            PlatformTest.inject(
                [IpBlackListRepo, FileService, AdminService],
                async (ipBlacklistRepo: IpBlackListRepo, fileService: FileService, adminService: AdminService) => {
                    // given
                    const blackListSpy = vi.spyOn(ipBlacklistRepo, "addIpBlock");
                    const processDeleteSpy = vi.spyOn(fileService, "processDelete");

                    // when
                    await adminService.blockIp("1.1.1.1", true);

                    // then
                    expect(blackListSpy).toHaveBeenCalled();
                    expect(processDeleteSpy).toHaveBeenCalled();
                },
            ),
        );
    });

    describe("removeBlockedIps", () => {
        // Given
        // When
        // Then
    });

    describe("deleteEntries", () => {
        // Given
        // When
        // Then
    });
});
