import { Controller, Inject } from "@tsed/di";
import { Get, Hidden, View } from "@tsed/schema";
import { UseBefore } from "@tsed/platform-middlewares";
import { BucketService } from "../../../services/BucketService.js";
import { AuthoriseBucket } from "../../../middleware/endpoint/AuthoriseBucket.js";
import { BucketAuthenticationException } from "../../../model/exceptions/BucketAuthenticationException.js";
import { BaseViewController } from "../../views/index.js";
import { SettingsService } from "../../../services/SettingsService.js";
import { BucketModel } from "../../../model/db/Bucket.model.js";

@Controller("/bucket")
@Hidden()
@UseBefore(AuthoriseBucket)
export class BucketView extends BaseViewController {
    public constructor(
        @Inject() private bucketService: BucketService,
        @Inject() settingsService: SettingsService,
    ) {
        super(settingsService);
    }

    @Get()
    @View("/secure/files.ejs")
    public showBucketPage(): Promise<BucketModel> {
        return this.getModel();
    }

    @Get("/stats")
    @View("/secure/stats.ejs")
    public showStatistics(): Promise<unknown> {
        return this.getModel();
    }

    private async getModel(): Promise<BucketModel> {
        const bucket = await this.bucketService.getBucket();
        if (!bucket) {
            throw new BucketAuthenticationException({
                name: "BucketAuthenticationException",
                message: "Token is required",
                status: 401,
            });
        }
        return super.mergeWithEnvs({
            bucket,
            loginType: "bucket",
        });
    }
}
