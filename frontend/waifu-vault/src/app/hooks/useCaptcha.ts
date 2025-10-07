"use client";

import { useCallback, useEffect, useState } from "react";
import { useEnvironment } from "@/app/hooks/useEnvironment";
import { useErrorHandler } from "@/app/hooks/useErrorHandler";
import * as configApi from "@/app/utils/api/configApi";

export type CaptchaType = "turnstile" | "reCAPTCHA" | "hCaptcha" | null;

interface CaptchaConfig {
    captchaType: CaptchaType;
    siteKey: string | null;
}

export function useCaptcha() {
    const [config, setConfig] = useState<CaptchaConfig>({ captchaType: null, siteKey: null });
    const [isLoading, setIsLoading] = useState(true);
    const { backendRestBaseUrl } = useEnvironment();
    const { handleError } = useErrorHandler();

    const fetchCaptchaConfig = useCallback(async () => {
        return configApi.getCaptchaConfig(backendRestBaseUrl);
    }, [backendRestBaseUrl]);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const data = await fetchCaptchaConfig();
                setConfig(data);
            } catch (error) {
                handleError(error, {
                    defaultMessage: "Failed to fetch captcha config",
                    showToast: false,
                    rethrow: false,
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadConfig();
    }, [fetchCaptchaConfig, handleError]);

    return {
        captchaType: config.captchaType,
        siteKey: config.siteKey,
        isLoading,
        isEnabled: config.captchaType !== null && config.siteKey !== null,
        fetchCaptchaConfig,
    };
}
