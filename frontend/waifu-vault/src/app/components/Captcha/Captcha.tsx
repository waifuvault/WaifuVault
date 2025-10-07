"use client";

import React, { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { CaptchaType } from "@/app/hooks/useCaptcha";
import { getCaptchaScriptUrl } from "@/app/utils/captchaUtils";
import styles from "./Captcha.module.scss";

interface CaptchaProps {
    captchaType: CaptchaType;
    siteKey: string;
    onVerify?: (token: string) => void;
    onExpire?: () => void;
    onReset?: () => void;
}

export interface CaptchaHandle {
    reset: () => void;
}

export const Captcha = React.forwardRef<CaptchaHandle, CaptchaProps>(function Captcha(
    { captchaType, siteKey, onVerify, onExpire, onReset },
    ref,
) {
    const captchaRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | number | null>(null);

    const handleVerify = useCallback(
        (token: string) => {
            onVerify?.(token);
        },
        [onVerify],
    );

    const handleExpire = useCallback(() => {
        onExpire?.();
    }, [onExpire]);

    const resetCaptcha = useCallback(() => {
        if (!captchaType) {
            return;
        }

        try {
            const win = window as unknown as Record<string, unknown>;
            switch (captchaType) {
                case "turnstile":
                    if (
                        typeof win.turnstile !== "undefined" &&
                        widgetIdRef.current !== null &&
                        typeof (win.turnstile as Record<string, unknown>).reset === "function"
                    ) {
                        ((win.turnstile as Record<string, unknown>).reset as (id: string | number) => void)(
                            widgetIdRef.current,
                        );
                    }
                    break;
                case "reCAPTCHA":
                    if (
                        typeof win.grecaptcha !== "undefined" &&
                        typeof (win.grecaptcha as Record<string, unknown>).reset === "function"
                    ) {
                        ((win.grecaptcha as Record<string, unknown>).reset as (id?: string | number) => void)(
                            widgetIdRef.current ?? undefined,
                        );
                    }
                    break;
                case "hCaptcha":
                    if (
                        typeof win.hcaptcha !== "undefined" &&
                        widgetIdRef.current !== null &&
                        typeof (win.hcaptcha as Record<string, unknown>).reset === "function"
                    ) {
                        ((win.hcaptcha as Record<string, unknown>).reset as (id: string | number) => void)(
                            widgetIdRef.current,
                        );
                    }
                    break;
            }
            onReset?.();
        } catch (error) {
            console.log("Failed to reset captcha:", error);
        }
    }, [captchaType, onReset]);

    useImperativeHandle(ref, () => ({
        reset: resetCaptcha,
    }));

    useEffect(() => {
        if (!captchaType || !siteKey) {
            return;
        }

        const scriptUrl = getCaptchaScriptUrl(captchaType);
        if (!scriptUrl) {
            return;
        }

        const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
        if (existingScript) {
            return;
        }

        const script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, [captchaType, siteKey]);

    useEffect(() => {
        if (!captchaType || !siteKey || !captchaRef.current || widgetIdRef.current !== null) {
            return;
        }

        const renderCaptcha = () => {
            if (!captchaRef.current) {
                return;
            }

            const win = window as unknown as Record<string, unknown>;

            try {
                switch (captchaType) {
                    case "turnstile":
                        if (typeof win.turnstile !== "undefined") {
                            const turnstile = win.turnstile as Record<string, unknown>;
                            if (typeof turnstile.render === "function") {
                                widgetIdRef.current = (
                                    turnstile.render as (
                                        container: HTMLElement,
                                        options: Record<string, unknown>,
                                    ) => string
                                )(captchaRef.current, {
                                    sitekey: siteKey,
                                    theme: "dark",
                                    callback: handleVerify,
                                    "expired-callback": handleExpire,
                                });
                            }
                        }
                        break;
                    case "reCAPTCHA":
                        if (typeof win.grecaptcha !== "undefined") {
                            const grecaptcha = win.grecaptcha as Record<string, unknown>;
                            if (typeof grecaptcha.render === "function") {
                                widgetIdRef.current = (
                                    grecaptcha.render as (
                                        container: HTMLElement,
                                        options: Record<string, unknown>,
                                    ) => number
                                )(captchaRef.current, {
                                    sitekey: siteKey,
                                    theme: "dark",
                                    callback: handleVerify,
                                    "expired-callback": handleExpire,
                                });
                            }
                        }
                        break;
                    case "hCaptcha":
                        if (typeof win.hcaptcha !== "undefined") {
                            const hcaptcha = win.hcaptcha as Record<string, unknown>;
                            if (typeof hcaptcha.render === "function") {
                                widgetIdRef.current = (
                                    hcaptcha.render as (
                                        container: HTMLElement,
                                        options: Record<string, unknown>,
                                    ) => string
                                )(captchaRef.current, {
                                    sitekey: siteKey,
                                    theme: "dark",
                                    callback: handleVerify,
                                    "expired-callback": handleExpire,
                                });
                            }
                        }
                        break;
                }
            } catch (error) {
                console.log("Failed to render captcha:", error);
            }
        };

        const checkAndRender = setInterval(() => {
            const win = window as unknown as Record<string, unknown>;
            const isReady =
                (captchaType === "turnstile" && typeof win.turnstile !== "undefined") ||
                (captchaType === "reCAPTCHA" && typeof win.grecaptcha !== "undefined") ||
                (captchaType === "hCaptcha" && typeof win.hcaptcha !== "undefined");

            if (isReady) {
                clearInterval(checkAndRender);
                renderCaptcha();
            }
        }, 100);

        return () => {
            clearInterval(checkAndRender);
        };
    }, [captchaType, siteKey, handleVerify, handleExpire]);

    if (!captchaType || !siteKey) {
        return null;
    }

    return (
        <div className={styles.captchaContainer}>
            <div ref={captchaRef}></div>
        </div>
    );
});
