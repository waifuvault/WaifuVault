import { Get, Hidden, View } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Req, Res } from "@tsed/common";
import CaptchaServices from "../../model/constants/CaptchaServices.js";
import { CaptchaManager } from "../../manager/CaptchaManager.js";

@Controller("/")
@Hidden()
export class HomeView {
    public constructor(@Inject() private captchaManager: CaptchaManager) {}
    @Get()
    @View("index.ejs")
    public showRoot(): unknown {
        return null;
    }

    @Get("/login")
    @View("login.ejs")
    public showLogin(@Req() req: Req, @Res() res: Res): unknown {
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
