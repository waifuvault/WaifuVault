import { Inject, Injectable } from "@tsed/di";
import { CaptchaFactory } from "../factory/CaptchaFactory.js";
import type { ICaptchaEngine } from "../engine/ICaptchaEngine.js";
import { ReCAPTCHAException } from "../model/exceptions/ReCAPTCHAException.js";
import type { Request } from "express";
import { Logger } from "@tsed/logger";

@Injectable()
export class CaptchaManager {
    private readonly _engine: ICaptchaEngine | null;
    public constructor(
        @Inject() captchaFactory: CaptchaFactory,
        @Inject() private logger: Logger,
    ) {
        this._engine = captchaFactory.getEnabledService();
        if (this._engine === null) {
            this.logger.warn("No captcha service is enabled");
        } else {
            this.logger.info(`Using ${this._engine.type} as captcha service`);
        }
    }

    public async verify(request: Request): Promise<void> {
        if (!this._engine) {
            // no captcha service defined in .env
            return;
        }
        const response = await this._engine.verify(request);
        if (!response) {
            throw new ReCAPTCHAException("captcha verification has failed.");
        }
    }

    public get engine(): ICaptchaEngine | null {
        return this._engine;
    }
}
