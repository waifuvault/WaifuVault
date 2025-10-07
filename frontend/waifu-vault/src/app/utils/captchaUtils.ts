import type { CaptchaType } from "@/app/hooks/useCaptcha";

export function getCaptchaScriptUrl(captchaType: CaptchaType): string {
    switch (captchaType) {
        case "turnstile":
            return "https://challenges.cloudflare.com/turnstile/v0/api.js";
        case "reCAPTCHA":
            return "https://www.google.com/recaptcha/api.js";
        case "hCaptcha":
            return "https://js.hcaptcha.com/1/api.js";
        default:
            return "";
    }
}

export function getCaptchaClassName(captchaType: CaptchaType): string {
    switch (captchaType) {
        case "turnstile":
            return "cf-turnstile";
        case "reCAPTCHA":
            return "g-recaptcha";
        case "hCaptcha":
            return "h-captcha";
        default:
            return "";
    }
}

export function getCaptchaBodyKey(captchaType: CaptchaType): string | null {
    switch (captchaType) {
        case "turnstile":
            return "cf-turnstile-response";
        case "reCAPTCHA":
            return "g-recaptcha-response";
        case "hCaptcha":
            return "h-captcha-response";
        default:
            return null;
    }
}
