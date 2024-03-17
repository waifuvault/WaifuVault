import type { IHttpErrorRenderEngine } from "../../IHttpErrorRenderEngine.js";
import { ReCAPTCHAException } from "../../../model/exceptions/ReCAPTCHAException.js";
import { Inject, Injectable, InjectContext, ProviderScope } from "@tsed/di";
import { HTTP_RENDER_ENGINE } from "../../../model/di/tokens.js";
import { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { type PlatformContext, PlatformResponse } from "@tsed/common";
import { Exception } from "@tsed/exceptions";
import { CaptchaManager } from "../../../manager/CaptchaManager.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE,
})
export class ReCAPTCHALoginExceptionRenderEngine implements IHttpErrorRenderEngine<string, ReCAPTCHAException> {
    public constructor(@Inject() private captchaManager: CaptchaManager) {}

    @InjectContext()
    protected $ctx?: PlatformContext;

    public render(obj: HttpErrorRenderObj<ReCAPTCHAException>, response: PlatformResponse): Promise<string> {
        const captchaType = this.captchaManager.engine?.type ?? null;
        return response.render("login.ejs", {
            captchaType,
            ...obj,
        });
    }

    public supportsError(exception: Exception): boolean {
        return this.$ctx?.url.includes("/login") ? exception instanceof ReCAPTCHAException : false;
    }
}
