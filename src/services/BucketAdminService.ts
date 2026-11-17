import { AbstractAdminService } from "./AbstractAdminService.js";
import { Inject } from "@tsed/di";
import { FileRepo } from "../db/repo/FileRepo.js";
import { FileService } from "./FileService.js";
import { IpBlackListRepo } from "../db/repo/IpBlackListRepo.js";
import { SettingsDao } from "../db/dao/SettingsDao.js";
import { BucketService } from "./BucketService.js";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";
import BucketType from "../model/constants/BucketType.js";
import { BucketAuthenticationException } from "../model/exceptions/BucketAuthenticationException.js";

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

    protected override getBucketScope(): string {
        const bucketToken = this.bucketService.getLoggedInBucketToken();
        if (!bucketToken) {
            throw new BucketAuthenticationException({
                name: "BucketAuthenticationException",
                message: "Token is required",
                status: 401,
            });
        }
        return bucketToken;
    }

    public override async getAllEntries(): Promise<FileUploadModel[]> {
        const bucket = await this.bucketService.getBucket();
        if (!bucket) {
            return [];
        }
        return bucket.files?.filter(e => !e.hasExpired) ?? [];
    }

    public override async deleteEntries(ids: number[]): Promise<boolean> {
        if (ids.length === 0) {
            return false;
        }
        const bucket = await this.bucketService.getBucket();
        const requestedIds = new Set(ids);
        const ownedFiles = bucket?.files?.filter(file => requestedIds.has(file.id)) ?? [];
        if (ownedFiles.length === 0) {
            return false;
        }
        await this.fileService.processDelete(ownedFiles.map(file => file.token));
        return true;
    }

    public getBucketType(token: string): Promise<BucketType | null> {
        return this.bucketService.getBucketType(token);
    }
}
