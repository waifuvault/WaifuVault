import { Get, Hidden, View } from "@tsed/schema";
import { Controller } from "@tsed/di";
import { Authorize } from "@tsed/passport";
import type { CustomUserInfoModel } from "../../model/auth/CustomUserInfoModel.js";
import { Req, Res } from "@tsed/common";
import type { Request, Response } from "express";

@Controller("/")
@Hidden()
export class AdminView {
    @Get()
    @Authorize("loginAuthProvider")
    public showAdmin(@Req() req: Request, @Res() res: Response): unknown {
        res.redirect("/admin/files");
        return {
            user: req.user as CustomUserInfoModel,
        };
    }

    @Get("/files")
    @Authorize("loginAuthProvider")
    @View("/secure/files.ejs")
    public showFileAdmin(): unknown {
        return null;
    }

    @Get("/stats")
    @Authorize("loginAuthProvider")
    @View("/secure/stats.ejs")
    public showStatistics(): unknown {
        return null;
    }

    @Get("/user")
    @Authorize("loginAuthProvider")
    @View("/secure/user.ejs")
    public showUserAdmin(@Req() req: Request): unknown {
        return {
            user: req.user as CustomUserInfoModel,
        };
    }
}
