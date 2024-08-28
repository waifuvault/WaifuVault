import { Controller, Inject } from "@tsed/di";
import { Get, Hidden, View } from "@tsed/schema";
import { UseBefore } from "@tsed/common";
import { BucketService } from "../../services/BucketService.js";
import { AuthoriseBucket } from "../../middleware/endpoint/AuthoriseBucket.js";
import { BucketAuthenticationException } from "../../model/exceptions/BucketAuthenticationException.js";

@Controller("/bucket")
@Hidden()
@UseBefore(AuthoriseBucket)
export class BucketView {
    public constructor(@Inject() private bucketService: BucketService) {}

    @Get()
    @View("/secure/files.ejs")
    public showBucketPage(): Promise<unknown> {
        return this.getModel();
    }

    @Get("/stats")
    @View("/secure/stats.ejs")
    public showStatistics(): Promise<unknown> {
        return this.getModel();
    }

    private async getModel(): Promise<unknown> {
        const bucket = await this.bucketService.getBucket();
        if (!bucket) {
            throw new BucketAuthenticationException({
                name: "BucketAuthenticationException",
                message: "Token is required",
                status: 401,
            });
        }
        return {
            bucket,
            loginType: "bucket",
        };
    }
}
