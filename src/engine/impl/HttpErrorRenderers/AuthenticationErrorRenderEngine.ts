import { Inject, Injectable, ProviderScope } from "@tsed/di";
import { HTTP_RENDER_ENGINE } from "../../../model/di/tokens.js";
import type { IHttpErrorRenderEngine } from "../../IHttpErrorRenderEngine.js";
import { AuthenticationError } from "../../../model/exceptions/AuthenticationError.js";
import { Exception } from "@tsed/exceptions";
import { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { PlatformResponse } from "@tsed/common";
import { CaptchaManager } from "../../../manager/CaptchaManager.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE,
})
export class AuthenticationErrorRenderEngine implements IHttpErrorRenderEngine<string, AuthenticationError> {
    public constructor(@Inject() private captchaManager: CaptchaManager) {}

    public supportsError(exception: Exception): boolean {
        return exception instanceof AuthenticationError;
    }

    public render(obj: HttpErrorRenderObj<AuthenticationError>, response: PlatformResponse): Promise<string> {
        const captchaType = this.captchaManager.engine?.type ?? null;
        return response.render("login.ejs", {
            captchaType,
            ...obj,
        });
    }
}
