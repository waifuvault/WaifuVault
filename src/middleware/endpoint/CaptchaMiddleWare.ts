import { Middleware, MiddlewareMethods } from "@tsed/platform-middlewares";
import { Inject } from "@tsed/di";
import { CaptchaManager } from "../../manager/CaptchaManager.js";
import type { Request } from "express";
import { Req } from "@tsed/common";

@Middleware()
export class CaptchaMiddleWare implements MiddlewareMethods {
    public constructor(@Inject() private captchaManager: CaptchaManager) {}

    public use(@Req() req: Request): Promise<void> {
        return this.captchaManager.verify(req);
    }
}
