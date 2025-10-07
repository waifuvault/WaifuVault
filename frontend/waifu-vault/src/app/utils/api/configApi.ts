import type { CaptchaType } from "@/app/hooks/useCaptcha";

export interface CaptchaConfig {
    captchaType: CaptchaType;
    siteKey: string | null;
}

export async function getCaptchaConfig(backendRestBaseUrl: string): Promise<CaptchaConfig> {
    const response = await fetch(`${backendRestBaseUrl}/config/captcha`);

    if (!response.ok) {
        throw new Error(`Failed to fetch captcha config: ${response.statusText}`);
    }

    const data = await response.json();
    return {
        captchaType: data.captchaType as CaptchaType,
        siteKey: data.siteKey,
    };
}
