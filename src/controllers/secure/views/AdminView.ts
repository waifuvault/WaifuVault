import { Get, Hidden, View } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Authorize } from "@tsed/passport";
import type { CustomUserInfoModel } from "../../../model/auth/CustomUserInfoModel.js";
import { Req, Res } from "@tsed/platform-http";
import type { Request, Response } from "express";
import { BaseViewController } from "../../views/index.js";
import { SettingsService } from "../../../services/SettingsService.js";

@Controller("/")
@Hidden()
@Authorize("loginAuthProvider")
export class AdminView extends BaseViewController {
    public constructor(@Inject() settingsService: SettingsService) {
        super(settingsService);
    }

    @Get()
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
        return super.mergeWithEnvs({
            user: req.user as CustomUserInfoModel,
            loginType: "user",
        });
    }

    @Get("/stats")
    @View("/secure/stats.ejs")
    public showStatistics(@Req() req: Request): unknown {
        return super.mergeWithEnvs({
            user: req.user as CustomUserInfoModel,
            loginType: "user",
        });
    }

    @Get("/user")
    @View("/secure/user.ejs")
    public showUserAdmin(@Req() req: Request): unknown {
        return super.mergeWithEnvs({
            user: req.user as CustomUserInfoModel,
            loginType: "user",
        });
    }
}
