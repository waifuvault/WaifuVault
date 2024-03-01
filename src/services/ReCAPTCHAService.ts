import { Constant, Inject, Service } from "@tsed/di";
import { ReCAPTCHAResponse } from "../utils/typeings.js";
import fetch, { FormData } from "node-fetch";
import { Logger } from "@tsed/common";
import GlobalEnv from "../model/constants/GlobalEnv.js";

@Service()
export class ReCAPTCHAService {
    @Inject()
    private logger: Logger;

    private readonly baseUrl = "https://www.google.com/recaptcha/api/siteverify";

    @Constant(GlobalEnv.RECAPTCHA_SECRET_KEY)
    private readonly reCAPTCHASecretKey: string;

    public async validateResponse(clientResponse: string): Promise<boolean> {
        const form = new FormData();
        form.append("secret", this.reCAPTCHASecretKey);
        form.append("response", clientResponse);
        const response = await fetch(this.baseUrl, {
            method: "POST",
            body: form,
        });
        const responseJson = (await response.json()) as ReCAPTCHAResponse;
        const respBool = responseJson.success;
        if (!respBool) {
            this.logger.error(responseJson["error-codes"]);
        }
        return respBool;
    }
}
