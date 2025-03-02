import { AbstractCaptchaEngine } from "./AbstractCaptchaEngine.js";
import CaptchaServices from "../../../model/constants/CaptchaServices.js";
import { ReCAPTCHAResponse } from "../../../utils/typeings.js";
import { Inject, Injectable, ProviderScope } from "@tsed/di";
import { Logger } from "@tsed/common";
import { CAPTCHA_ENGINE } from "../../../model/di/tokens.js";
import { GlobalEnv } from "../../../model/constants/GlobalEnv.js";
import { SettingsService } from "../../../services/SettingsService.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: CAPTCHA_ENGINE,
})
export class ReCAPTCHAEngine extends AbstractCaptchaEngine<ReCAPTCHAResponse> {
    public constructor(@Inject() logger: Logger, @Inject() settingsService: SettingsService) {
        super(CaptchaServices.RECAPTCHA, logger, settingsService.getSetting(GlobalEnv.CAPTCHA_SECRET_KEY));
    }

    protected override get bodyKey(): string {
        return "g-recaptcha-response";
    }

    protected override get baseUrl(): string {
        return "https://www.google.com/recaptcha/api/siteverify";
    }
}
