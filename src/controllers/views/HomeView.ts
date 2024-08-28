import { Get, Hidden, View } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Req, Res, Session } from "@tsed/common";
import CaptchaServices from "../../model/constants/CaptchaServices.js";
import { CaptchaManager } from "../../manager/CaptchaManager.js";
import type { Request, Response } from "express";

@Controller("/")
@Hidden()
export class HomeView {
    public constructor(@Inject() private captchaManager: CaptchaManager) {}

    @Get()
    @View("index.ejs")
    public showRoot(): unknown {
        return null;
    }

    @Get("/bucketAccess")
    @View("bucketAccess.ejs")
    public showBucketLoginPage(@Res() res: Response, @Session() session: Record<string, unknown>): unknown {
        if (session.bucket) {
            res.redirect("/admin/bucket");
        }
        const captchaType = this.activeCaptchaService;
        return {
            captchaType,
        };
    }

    @Get("/login")
    @View("login.ejs")
    public showLogin(@Req() req: Request, @Res() res: Response): unknown {
        if (req.user) {
            res.redirect("/admin/stats");
        }
        const captchaType = this.activeCaptchaService;
        return {
            captchaType,
        };
    }

    private get activeCaptchaService(): CaptchaServices | null {
        return this.captchaManager.engine?.type ?? null;
    }
}
