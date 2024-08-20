import { Inject, InjectContext, Service } from "@tsed/di";
import type { PlatformContext } from "@tsed/common";
import { BucketModel } from "../../model/db/Bucket.model.js";
import { Builder } from "builder-pattern";
import { NetworkUtils } from "../../utils/Utils.js";
import { InternalServerError } from "@tsed/exceptions";
import { Logger } from "@tsed/logger";
import crypto from "node:crypto";
import { BucketDao } from "../dao/BucketDao.js";

@Service()
export class BucketRepo {
    @InjectContext()
    protected $ctx?: PlatformContext;

    public constructor(
        @Inject() private bucketDao: BucketDao,
        @Inject() private logger: Logger,
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

    public deleteBucket(bucketToken: string): Promise<boolean> {
        return this.bucketDao.deleteBucket(bucketToken);
    }

    public getBucket(id: string | number): Promise<BucketModel | null> {
        return this.bucketDao.getBucket(id);
    }
}
