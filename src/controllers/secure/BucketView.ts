import { Controller, Inject } from "@tsed/di";
import { Get, Hidden, View } from "@tsed/schema";
import { Authorize } from "@tsed/passport";
import type { CustomUserInfoModel } from "../../model/auth/CustomUserInfoModel";
import { Req, Res } from "@tsed/common";
import type { Request, Response } from "express";
import { BucketService } from "../../services/BucketService.js";

@Controller("/bucket")
@Hidden()
export class BucketView {
    public constructor(@Inject() private bucketService: BucketService) {}

    @Get()
    @View("/secure/files.ejs")
    @Authorize("bucketAuthProvider")
    public showBucketPage(@Req() req: Request, @Res() res: Response): Promise<unknown> {
        return this.getModel(req, res);
    }

    @Get("/stats")
    @View("/secure/stats.ejs")
    @Authorize("bucketAuthProvider")
    public showStatistics(@Req() req: Request, @Res() res: Response): Promise<unknown> {
        return this.getModel(req, res);
    }

    private async getModel(req: Request, res: Response): Promise<unknown> {
        const bucket = await this.bucketService.getBucket();
        if (!bucket) {
            return new Promise((resolve, reject) => {
                req.logout(err => {
                    if (err) {
                        reject(err);
                    }
                    res.redirect("/bucketAccess");
                    resolve(null);
                });
            });
        }
        return {
            user: req.user as CustomUserInfoModel,
            bucket,
            loginType: "bucket",
        };
    }
}
