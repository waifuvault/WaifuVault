import { Inject, Injectable } from "@tsed/di";
import { ICaptchaEngine } from "../engine/ICaptchaEngine.js";
import { CAPTCHA_ENGINE } from "../model/di/tokens.js";

@Injectable()
export class CaptchaFactory {
    public constructor(@Inject(CAPTCHA_ENGINE) private readonly engines: ICaptchaEngine[]) {}

    public getEnabledService(): ICaptchaEngine | null {
        return this.engines.find(e => e.enabled) ?? null;
    }
}
