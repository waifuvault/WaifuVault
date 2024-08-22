import { Get, Hidden, View } from "@tsed/schema";
import { Controller } from "@tsed/di";
import { Authorize } from "@tsed/passport";
import type { CustomUserInfoModel } from "../../model/auth/CustomUserInfoModel.js";
import { Req, Res, UseBefore } from "@tsed/common";
import type { Request, Response } from "express";
import { UserOnlyMiddleware } from "../../middleware/endpoint/UserOnlyMiddleware.js";

@Controller("/")
@Hidden()
@UseBefore(UserOnlyMiddleware)
export class AdminView {
    @Get()
    @Authorize("loginAuthProvider")
    public showAdmin(@Req() req: Request, @Res() res: Response): unknown {
        res.redirect("/admin/files");
        return {
            user: req.user as CustomUserInfoModel,
            loginType: "user",
        };
    }

    @Get("/files")
    @Authorize(["loginAuthProvider", "bucketAuthProvider"])
    @View("/secure/files.ejs")
    public showFileAdmin(@Req() req: Request): unknown {
        return {
            user: req.user as CustomUserInfoModel,
            loginType: "user",
        };
    }

    @Get("/stats")
    @Authorize(["loginAuthProvider", "bucketAuthProvider"])
    @View("/secure/stats.ejs")
    public showStatistics(@Req() req: Request): unknown {
        return {
            user: req.user as CustomUserInfoModel,
            loginType: "user",
        };
    }

    @Get("/user")
    @Authorize("loginAuthProvider")
    @View("/secure/user.ejs")
    public showUserAdmin(@Req() req: Request): unknown {
        return {
            user: req.user as CustomUserInfoModel,
            loginType: "user",
        };
    }
}
