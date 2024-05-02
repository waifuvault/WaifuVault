import { AbstractCaptchaEngine } from "./AbstractCaptchaEngine.js";
import { HcaptchaResponse } from "../../../utils/typeings.js";
import { Constant, Inject, Injectable, ProviderScope } from "@tsed/di";
import { CAPTCHA_ENGINE } from "../../../model/di/tokens.js";
import { Logger } from "@tsed/common";
import CaptchaServices from "../../../model/constants/CaptchaServices.js";
import GlobalEnv from "../../../model/constants/GlobalEnv.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: CAPTCHA_ENGINE,
})
export class HcaptchaEngine extends AbstractCaptchaEngine<HcaptchaResponse> {
    @Constant(GlobalEnv.CAPTCHA_SECRET_KEY)
    private readonly hCaptchaSecretKey: string;

    public constructor(@Inject() logger: Logger) {
        super(CaptchaServices.HCAPTCHA, logger);
    }

    protected override get bodyKey(): string {
        return "h-captcha-response";
    }

    protected override get secretKey(): string {
        return this.hCaptchaSecretKey;
    }

    protected override get baseUrl(): string {
        return "https://api.hcaptcha.com/siteverify";
    }
}
