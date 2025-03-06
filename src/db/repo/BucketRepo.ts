import { Inject, Injectable, InjectContext } from "@tsed/di";
import type { PlatformContext } from "@tsed/common";
import { BucketModel } from "../../model/db/Bucket.model.js";
import { Builder } from "builder-pattern";
import { NetworkUtils } from "../../utils/Utils.js";
import { InternalServerError } from "@tsed/exceptions";
import { Logger } from "@tsed/logger";
import { BucketDao } from "../dao/BucketDao.js";
import { ThumbnailCacheRepo } from "./ThumbnailCacheRepo.js";
import { uuid } from "../../utils/uuidUtils.js";
import { FileDao } from "../dao/FileDao.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { dataSource } from "../DataSource.js";
import BucketType from "../../model/constants/BucketType";

@Injectable()
export class BucketRepo {
    @InjectContext()
    protected $ctx?: PlatformContext;

    public constructor(
        @Inject() private bucketDao: BucketDao,
        @Inject() private logger: Logger,
        @Inject() private fileDao: FileDao,
        @Inject() private thumbnailCacheRepo: ThumbnailCacheRepo,
    ) {}

    public async createBucket(): Promise<BucketModel> {
        const bucketBuilder = Builder(BucketModel);
        if (!this.$ctx) {
            this.logger.error("Unable to create bucket because the current platform context is undefined");
            throw new InternalServerError("Unable to create bucket");
        }
        const ip = NetworkUtils.getIp(this.$ctx.request.request);
        const existingBucket = await this.bucketDao.getBucketByIp(ip);
        if (existingBucket) {
            return existingBucket;
        }
        bucketBuilder.ip(ip);
        const token = uuid();
        bucketBuilder.bucketToken(token);
        const bucket = bucketBuilder.build();
        return this.bucketDao.createBucket(bucket);
    }

    public async deleteBucket(bucketToken: string): Promise<boolean> {
        let files: FileUploadModel[] = [];
        const res = await dataSource.transaction(async tx => {
            const bucket = await this.bucketDao.getBucket(bucketToken, true, true, tx);
            if (!bucket) {
                return false;
            }
            if (bucket.files) {
                files = bucket.files;
                await this.thumbnailCacheRepo.deleteThumbsIfExist(files, tx);
            }
            return this.bucketDao.deleteBucket(bucketToken, tx);
        });
        // clear file redis cache only if transaction was commited
        await this.fileDao.clearCache(files.map(f => f.token));
        return res;
    }

    public getBucket(id: string | number, includeFiles = true, includeAlbums = true): Promise<BucketModel | null> {
        return this.bucketDao.getBucket(id, includeFiles, includeAlbums);
    }

    public bucketExists(token: string): Promise<boolean> {
        return this.bucketDao.bucketExists(token);
    }

    public getBucketType(token: string): Promise<BucketType | null> {
        return this.bucketDao.getBucketType(token);
    }

    public setBucketType(token: string, bucketType: BucketType): Promise<boolean> {
        return this.bucketDao.setBucketType(token, bucketType);
    }
}
