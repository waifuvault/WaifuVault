import { Inject, Injectable, ProviderScope } from "@tsed/di";
import { HTTP_RENDER_ENGINE } from "../../../model/di/tokens.js";
import type { IHttpErrorRenderEngine } from "../../IHttpErrorRenderEngine.js";
import { BucketAuthenticationException } from "../../../model/exceptions/BucketAuthenticationException.js";
import { HttpErrorRenderObj } from "../../../utils/typeings.js";
import { PlatformResponse } from "@tsed/platform-http";
import { Exception } from "@tsed/exceptions";
import { CaptchaManager } from "../../../manager/CaptchaManager.js";
import { AbstractEjsRenderEngine } from "./AbstractEjsRenderEngine.js";
import { SettingsService } from "../../../services/SettingsService.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: HTTP_RENDER_ENGINE,
})
export class BucketAuthenticationErrorRenderEngine
    extends AbstractEjsRenderEngine<string>
    implements IHttpErrorRenderEngine<string, BucketAuthenticationException>
{
    public constructor(
        @Inject() private captchaManager: CaptchaManager,
        @Inject() settingsService: SettingsService,
    ) {
        super(settingsService);
    }

    public render(obj: HttpErrorRenderObj<BucketAuthenticationException>, response: PlatformResponse): Promise<string> {
        const captchaType = this.captchaManager.engine?.type ?? null;
        return super.renderWithEnvs("bucketAccess.ejs", response, { captchaType, ...obj });
    }

    public supportsError(exception: Exception): boolean {
        return exception instanceof BucketAuthenticationException;
    }
}
