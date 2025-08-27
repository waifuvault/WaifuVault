import { AbstractAdminService } from "./AbstractAdminService.js";
import { Inject } from "@tsed/di";
import { FileRepo } from "../db/repo/FileRepo.js";
import { FileService } from "./FileService.js";
import { IpBlackListRepo } from "../db/repo/IpBlackListRepo.js";
import { SettingsDao } from "../db/dao/SettingsDao.js";
import { BucketService } from "./BucketService.js";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";

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
        super(ipBlackListRepo, repo, fileService, settingsDao.getSetting(GlobalEnv.BASE_URL));
    }

    public override getFileSearchRecordCount(search: string, bucket?: string): Promise<number> {
        return this.repo.getSearchRecordCount(search, bucket);
    }

    public override getFileRecordCount(bucket?: string): Promise<number> {
        return this.repo.getRecordCount(bucket);
    }

    public override async getAllEntries(): Promise<FileUploadModel[]> {
        const bucket = await this.bucketService.getBucket();
        if (!bucket) {
            return [];
        }
        return bucket.files?.filter(e => !e.hasExpired) ?? [];
    }

    public override getPagedEntries(
        start: number,
        length: number,
        sortColumn = "id",
        sortDir = "ASC",
        bucket: string,
        search?: string,
    ): Promise<FileUploadModel[]> {
        return this.repo.getAllEntriesOrdered(start, length, sortColumn, sortDir, search, bucket);
    }
}
