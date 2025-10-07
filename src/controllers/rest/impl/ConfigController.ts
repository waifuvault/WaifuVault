import { BaseRestController } from "../BaseRestController.js";
import { Controller, Inject } from "@tsed/di";
import { Description, Get, Name, Returns, Summary } from "@tsed/schema";
import { StatusCodes } from "http-status-codes";
import { DefaultRenderException } from "../../../model/rest/DefaultRenderException.js";
import { CaptchaConfigDto } from "../../../model/dto/CaptchaConfigDto.js";
import { CaptchaManager } from "../../../manager/CaptchaManager.js";
import { SettingsService } from "../../../services/SettingsService.js";
import { GlobalEnv } from "../../../model/constants/GlobalEnv.js";

@Controller("/config")
@Description("API for configuration endpoints")
@Name("Configuration")
@(Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked"))
export class ConfigController extends BaseRestController {
    public constructor(
        @Inject() private captchaManager: CaptchaManager,
        @Inject() private settingsService: SettingsService,
    ) {
        super();
    }

    @Get("/captcha")
    @Returns(StatusCodes.OK, CaptchaConfigDto)
    @Description("Get captcha configuration for client-side integration")
    @Summary("Get captcha configuration")
    public getCaptchaConfig(): CaptchaConfigDto {
        const captchaType = this.captchaManager.engine?.type ?? null;
        const siteKey = this.settingsService.getSetting(GlobalEnv.CAPTCHA_SITE_KEY);
        return new CaptchaConfigDto(captchaType, siteKey);
    }
}
