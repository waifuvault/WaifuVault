import { AbstractCaptchaEngine } from "./AbstractCaptchaEngine.js";
import CaptchaServices from "../../../model/constants/CaptchaServices.js";
import { ReCAPTCHAResponse } from "../../../utils/typeings.js";
import { Constant, Inject, Injectable, ProviderScope } from "@tsed/di";
import GlobalEnv from "../../../model/constants/GlobalEnv.js";
import { Logger } from "@tsed/common";
import { CAPTCHA_ENGINE } from "../../../model/di/tokens.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: CAPTCHA_ENGINE,
})
export class ReCAPTCHAEngine extends AbstractCaptchaEngine<ReCAPTCHAResponse> {
    @Constant(GlobalEnv.CAPTCHA_SECRET_KEY)
    private readonly reCAPTCHASecretKey: string;

    public constructor(@Inject() logger: Logger) {
        super(CaptchaServices.RECAPTCHA, logger);
    }

    protected override get bodyKey(): string {
        return "g-recaptcha-response";
    }

    protected override get secretKey(): string {
        return this.reCAPTCHASecretKey;
    }

    protected override get baseUrl(): string {
        return "https://www.google.com/recaptcha/api/siteverify";
    }
}
