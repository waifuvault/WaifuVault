import { AbstractCaptchaEngine } from "./AbstractCaptchaEngine.js";
import { Inject, Injectable, ProviderScope } from "@tsed/di";
import { CAPTCHA_ENGINE } from "../../../model/di/tokens.js";
import CaptchaServices from "../../../model/constants/CaptchaServices.js";
import { TurnstileResponse } from "../../../utils/typeings.js";
import { Logger } from "@tsed/logger";
import { GlobalEnv } from "../../../model/constants/GlobalEnv.js";
import { SettingsService } from "../../../services/SettingsService.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: CAPTCHA_ENGINE,
})
export class TurnstileCaptchaEngine extends AbstractCaptchaEngine<TurnstileResponse> {
    public constructor(@Inject() logger: Logger, @Inject() settingsService: SettingsService) {
        super(CaptchaServices.TURNSTILE, logger, settingsService.getSetting(GlobalEnv.CAPTCHA_SECRET_KEY));
    }

    protected override get bodyKey(): string {
        return "cf-turnstile-response";
    }

    protected override get baseUrl(): string {
        return "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    }
}
