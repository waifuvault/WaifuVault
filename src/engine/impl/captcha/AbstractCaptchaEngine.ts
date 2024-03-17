import CaptchaServices from "../../../model/constants/CaptchaServices.js";
import process from "process";
import { ICaptchaEngine } from "../../ICaptchaEngine.js";
import type { Request } from "express";
import { CaptchaResponse } from "../../../utils/typeings.js";
import { BadRequest } from "@tsed/exceptions";
import { NetworkUtils } from "../../../utils/Utils.js";
import { Logger } from "@tsed/common";

export abstract class AbstractCaptchaEngine<T extends CaptchaResponse> implements ICaptchaEngine {
    protected constructor(
        public readonly type: CaptchaServices,
        private readonly logger: Logger,
    ) {}

    public get enabled(): boolean {
        return process.env.CAPTCHA_SERVICE === this.type;
    }

    public async verify(request: Request): Promise<boolean> {
        const clientResponse: string | undefined = request.body[this.bodyKey];
        if (!clientResponse) {
            throw new BadRequest("captcha client response missing.");
        }
        const ip = NetworkUtils.getIp(request);
        const form = new FormData();
        form.append("secret", this.secretKey);
        form.append("response", clientResponse);
        form.append("remoteip", ip);
        const response = await fetch(this.baseUrl, {
            method: "POST",
            body: form,
        });
        const responseJson = (await response.json()) as T;
        const respBool = responseJson.success;
        if (!respBool) {
            this.logger.error(responseJson["error-codes"]);
        }
        return respBool;
    }

    protected abstract get baseUrl(): string;

    protected abstract get secretKey(): string;

    protected abstract get bodyKey(): string;
}
