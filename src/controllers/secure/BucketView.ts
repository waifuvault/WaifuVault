import { Controller, Inject } from "@tsed/di";
import { Get, Hidden, View } from "@tsed/schema";
import { Authorize } from "@tsed/passport";
import type { CustomUserInfoModel } from "../../model/auth/CustomUserInfoModel";
import { Req } from "@tsed/common";
import type { Request } from "express";
import { BucketService } from "../../services/BucketService.js";

@Controller("/bucket")
@Hidden()
export class BucketView {
    public constructor(@Inject() private bucketService: BucketService) {}

    @Get()
    @View("/secure/files.ejs")
    @Authorize("bucketAuthProvider")
    public async showBucketPage(@Req() req: Request): Promise<unknown> {
        const bucket = await this.bucketService.getBucket();
        return {
            user: req.user as CustomUserInfoModel,
            bucket,
        };
    }
}
