import { AbstractCaptchaEngine } from "./AbstractCaptchaEngine.js";
import { Constant, Inject, Injectable, ProviderScope } from "@tsed/di";
import { CAPTCHA_ENGINE } from "../../../model/di/tokens.js";
import CaptchaServices from "../../../model/constants/CaptchaServices.js";
import GlobalEnv from "../../../model/constants/GlobalEnv.js";
import { TurnstileResponse } from "../../../utils/typeings.js";
import { Logger } from "@tsed/common";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: CAPTCHA_ENGINE,
})
export class TurnstileCaptchaEngine extends AbstractCaptchaEngine<TurnstileResponse> {
    @Constant(GlobalEnv.CAPTCHA_SECRET_KEY)
    private readonly turnstileSecretKey: string;

    public constructor(@Inject() logger: Logger) {
        super(CaptchaServices.TURNSTILE, logger);
    }

    protected override get bodyKey(): string {
        return "cf-turnstile-response";
    }

    protected override get secretKey(): string {
        return this.turnstileSecretKey;
    }

    protected override get baseUrl(): string {
        return "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    }
}
