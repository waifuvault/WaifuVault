import { Controller } from "@tsed/di";
import { Get, Hidden, View } from "@tsed/schema";
import { Authorize } from "@tsed/passport";
import type { CustomUserInfoModel } from "../../model/auth/CustomUserInfoModel";
import { Req } from "@tsed/common";
import type { Request } from "express";

@Controller("/bucket")
@Hidden()
export class BucketView {
    @Get()
    @View("/secure/files.ejs")
    @Authorize("bucketAuthProvider")
    public showBucketPage(@Req() req: Request): unknown {
        return {
            user: req.user as CustomUserInfoModel,
        };
    }
}
