import type { Request } from "express";
import CaptchaServices from "../model/constants/CaptchaServices.js";

export interface ICaptchaEngine {
    /**
     * Verify the client response with the captcha service
     * @returns {Promise<boolean>}
     * @param request
     */
    verify(request: Request): Promise<boolean>;

    /**
     * Is this service enabled?
     */
    enabled: boolean;

    /**
     * Get the type of service
     */
    type: CaptchaServices;
}
