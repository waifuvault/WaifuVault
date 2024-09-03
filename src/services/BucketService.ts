import { Constant, Inject, InjectContext, Service } from "@tsed/di";
import { BucketDto } from "../model/dto/BucketDto.js";
import { BucketRepo } from "../db/repo/BucketRepo.js";
import { BucketModel } from "../model/db/Bucket.model.js";
import { Logger } from "@tsed/logger";
import type { PlatformContext } from "@tsed/common";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { FileService } from "./FileService.js";

@Service()
export class BucketService {
    public constructor(
        @Inject() private bucketRepo: BucketRepo,
        @Inject() private logger: Logger,
        @Inject() private fileService: FileService,
    ) {}

    @InjectContext()
    protected $ctx?: PlatformContext;

    @Constant(GlobalEnv.BASE_URL)
    private readonly baseUrl: string;

    public async createBucket(): Promise<BucketDto> {
        const bucket = await this.bucketRepo.createBucket();
        return BucketDto.fromModel(bucket, this.baseUrl);
    }

    public async getBucket(id?: string | number | undefined): Promise<BucketModel | null> {
        let bucket: BucketModel | null;
        if (!id) {
            return this.getLoggedInUserBucket();
        }
        if (typeof id === "number") {
            bucket = await this.bucketRepo.getBucket(id);
        } else {
            bucket = await this.bucketRepo.getBucket(id);
        }
        if (!bucket) {
            return null;
        }
        return bucket;
    }

    private getLoggedInUserBucket(): Promise<BucketModel | null> {
        const currentBucketToken: string | null = this.$ctx?.request.session?.bucket ?? null;
        if (!currentBucketToken) {
            return Promise.resolve(null);
        }
        return this.getBucket(currentBucketToken);
    }

    public async deleteBucket(token: string): Promise<boolean> {
        const bucket = await this.getBucket(token);
        if (!bucket) {
            return false;
        }
        const didDeleteBucket = await this.bucketRepo.deleteBucket(bucket.bucketToken);
        if (!didDeleteBucket) {
            this.logger.error(`Unable to delete bucket with token: "${bucket.bucketToken}"`);
            return false;
        }
        const currentSession = this.$ctx?.request.session ?? null;
        if (currentSession) {
            delete currentSession.bucket;
        }
        const filesToDelete = bucket.files ?? [];
        try {
            await this.fileService.deleteFilesFromDisk(filesToDelete);
        } catch (e) {
            this.logger.error(e);
            return false;
        }
        return true;
    }
}
