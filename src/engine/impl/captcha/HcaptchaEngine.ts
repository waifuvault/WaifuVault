import { AbstractCaptchaEngine } from "./AbstractCaptchaEngine.js";
import { HcaptchaResponse } from "../../../utils/typeings.js";
import { Inject, Injectable, ProviderScope } from "@tsed/di";
import { CAPTCHA_ENGINE } from "../../../model/di/tokens.js";
import { Logger } from "@tsed/logger";
import CaptchaServices from "../../../model/constants/CaptchaServices.js";
import { SettingsService } from "../../../services/SettingsService.js";
import { GlobalEnv } from "../../../model/constants/GlobalEnv.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: CAPTCHA_ENGINE,
})
export class HcaptchaEngine extends AbstractCaptchaEngine<HcaptchaResponse> {
    public constructor(@Inject() logger: Logger, @Inject() settingsService: SettingsService) {
        super(CaptchaServices.HCAPTCHA, logger, settingsService.getSetting(GlobalEnv.CAPTCHA_SECRET_KEY));
    }

    protected override get bodyKey(): string {
        return "h-captcha-response";
    }

    protected override get baseUrl(): string {
        return "https://api.hcaptcha.com/siteverify";
    }
}
