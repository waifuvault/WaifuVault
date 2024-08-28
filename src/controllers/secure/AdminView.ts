import { Get, Hidden, View } from "@tsed/schema";
import { Controller } from "@tsed/di";
import { Authorize } from "@tsed/passport";
import type { CustomUserInfoModel } from "../../model/auth/CustomUserInfoModel.js";
import { Req, Res } from "@tsed/common";
import type { Request, Response } from "express";

@Controller("/")
@Hidden()
@Authorize("loginAuthProvider")
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
    @View("/secure/files.ejs")
    public showFileAdmin(@Req() req: Request): unknown {
        return {
            user: req.user as CustomUserInfoModel,
            loginType: "user",
        };
    }

    @Get("/stats")
    @View("/secure/stats.ejs")
    public showStatistics(@Req() req: Request): unknown {
        return {
            user: req.user as CustomUserInfoModel,
            loginType: "user",
        };
    }

    @Get("/user")
    @View("/secure/user.ejs")
    public showUserAdmin(@Req() req: Request): unknown {
        return {
            user: req.user as CustomUserInfoModel,
            loginType: "user",
        };
    }
}
