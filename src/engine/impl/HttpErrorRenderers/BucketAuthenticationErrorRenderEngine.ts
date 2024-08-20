import { Inject, Injectable, ProviderScope } from "@tsed/di";
import { HTTP_RENDER_ENGINE } from "../../../model/di/tokens.js";
import type { IHttpErrorRenderEngine } from "../../IHttpErrorRenderEngine.js";
import { BucketAuthenticationException } from "../../../model/exceptions/BucketAuthenticationException.js";
import { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { PlatformResponse } from "@tsed/common";
import { Exception } from "@tsed/exceptions";
import { CaptchaManager } from "../../../manager/CaptchaManager.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE,
})
export class BucketAuthenticationErrorRenderEngine
    implements IHttpErrorRenderEngine<string, BucketAuthenticationException>
{
    public constructor(@Inject() private captchaManager: CaptchaManager) {}

    public render(obj: HttpErrorRenderObj<BucketAuthenticationException>, response: PlatformResponse): Promise<string> {
        const captchaType = this.captchaManager.engine?.type ?? null;
        return response.render("bucketAccess.ejs", {
            captchaType,
            ...obj,
        });
    }

    public supportsError(exception: Exception): boolean {
        return exception instanceof BucketAuthenticationException;
    }
}
