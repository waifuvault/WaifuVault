import { Inject, Injectable, InjectContext } from "@tsed/di";
import type { PlatformContext } from "@tsed/common";
import { BucketModel } from "../../model/db/Bucket.model.js";
import { Builder } from "builder-pattern";
import { NetworkUtils } from "../../utils/Utils.js";
import { InternalServerError } from "@tsed/exceptions";
import { Logger } from "@tsed/logger";
import crypto from "node:crypto";
import { BucketDao } from "../dao/BucketDao.js";
import { FileRepo } from "./FileRepo.js";
import { ThumbnailCacheRepo } from "./ThumbnailCacheRepo.js";

@Injectable()
export class BucketRepo {
    @InjectContext()
    protected $ctx?: PlatformContext;

    public constructor(
        @Inject() private bucketDao: BucketDao,
        @Inject() private logger: Logger,
        @Inject() private fileRepo: FileRepo,
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
        const token = crypto.randomUUID();
        bucketBuilder.bucketToken(token);
        const bucket = bucketBuilder.build();
        return this.bucketDao.createBucket(bucket);
    }

    public async deleteBucket(bucketToken: string): Promise<boolean> {
        const bucket = await this.getBucket(bucketToken);
        if (!bucket) {
            return false;
        }
        const res = await this.bucketDao.deleteBucket(bucketToken);
        if (bucket.files) {
            const files = bucket.files;
            await this.fileRepo.clearCache(files.map(f => f.token));
            await this.thumbnailCacheRepo.deleteThumbsIfExist(files);
        }

        return res;
    }

    public getBucket(id: string | number): Promise<BucketModel | null> {
        return this.bucketDao.getBucket(id);
    }

    public bucketExists(token: string): Promise<boolean> {
        return this.bucketDao.bucketExists(token);
    }
}
