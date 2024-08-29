import { AbstractAdminService } from "./AbstractAdminService.js";
import { AdminFileEntryDto } from "../model/dto/AdminFileEntryDto.js";
import { Inject } from "@tsed/di";
import { FileRepo } from "../db/repo/FileRepo.js";
import { FileService } from "./FileService.js";
import { IpBlackListRepo } from "../db/repo/IpBlackListRepo.js";
import { SettingsDao } from "../db/dao/SettingsDao.js";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { BucketService } from "./BucketService.js";

/**
 * This is an admin service that will work when a bucket is open
 */
export class BucketAdminService extends AbstractAdminService {
    public constructor(
        @Inject() repo: FileRepo,
        @Inject() fileService: FileService,
        @Inject() ipBlackListRepo: IpBlackListRepo,
        @Inject() settingsDao: SettingsDao,
        @Inject() private bucketService: BucketService,
    ) {
        super(ipBlackListRepo, repo, fileService, settingsDao.getSetting(GlobalEnv.BASE_URL)!);
    }

    public override getFileSearchRecordCount(search: string, bucket?: string): Promise<number> {
        return this.repo.getSearchRecordCount(search, bucket);
    }

    public override getFileRecordCount(bucket?: string): Promise<number> {
        return this.repo.getRecordCount(bucket);
    }

    public override async getAllEntries(): Promise<AdminFileEntryDto[]> {
        const allEntries = await this.repo.getAllEntries();
        const bucket = await this.bucketService.getBucket();
        const finalEntries = bucket ? (bucket.files ?? []) : allEntries;
        return this.buildFileEntryDtos(finalEntries.filter(entry => !entry.hasExpired));
    }

    public override async getPagedEntries(
        start: number,
        length: number,
        sortColumn = "id",
        sortDir = "ASC",
        bucket: string,
        search?: string,
    ): Promise<AdminFileEntryDto[]> {
        const entries = await this.repo.getAllEntriesOrdered(start, length, sortColumn, sortDir, search, bucket);
        return this.buildFileEntryDtos(entries.filter(entry => !entry.hasExpired));
    }
}
