"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.scss";
import type { CaptchaHandle } from "@/app/components";
import {
    Button,
    Captcha,
    Card,
    CardBody,
    CardHeader,
    Footer,
    Header,
    Input,
    ParticleBackground,
} from "@/app/components";
import { useAdminAuth, useCaptcha, useEnvironment } from "@/app/hooks";
import { useAdminAuthContext, useLoading } from "@/app/contexts";
import { getCaptchaBodyKey } from "@/app/utils/captchaUtils";

function AdminLoginContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<CaptchaHandle>(null);
    const { backendRestBaseUrl } = useEnvironment();
    const { withLoading, isLoading } = useLoading();
    const { isAuthenticated } = useAdminAuth();
    const { setIsAuthenticated } = useAdminAuthContext();
    const { captchaType, siteKey, isEnabled: isCaptchaEnabled } = useCaptcha();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (isAuthenticated === true) {
            router.replace("/admin");
            return;
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        const errorParam = searchParams.get("error");
        if (errorParam === "invalid_credentials") {
            setError("Invalid email or password. Please try again.");
        } else if (errorParam === "unauthorized") {
            setError("You are not authorized to access this area.");
        }
    }, [searchParams]);

    const handleCaptchaVerify = (token: string) => {
        setCaptchaVerified(true);
        setCaptchaToken(token);
    };

    const handleCaptchaExpire = () => {
        setCaptchaVerified(false);
        setCaptchaToken(null);
    };

    const handleCaptchaReset = () => {
        setCaptchaVerified(false);
        setCaptchaToken(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            return;
        }

        setError("");

        await withLoading(async () => {
            try {
                const requestBody: Record<string, string> = { email, password };

                if (isCaptchaEnabled && captchaToken && captchaType) {
                    const captchaKey = getCaptchaBodyKey(captchaType);
                    if (captchaKey) {
                        requestBody[captchaKey] = captchaToken;
                    }
                }

                const response = await fetch(`${backendRestBaseUrl}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                    credentials: "include",
                });

                if (response.ok) {
                    setIsAuthenticated(true);
                    router.push("/admin");
                } else {
                    const errorData = await response.json().catch(() => {
                        return { message: "Authentication failed" };
                    });
                    setError(errorData.message ?? "Authentication failed");
                    captchaRef.current?.reset();
                }
            } catch (err) {
                console.log("Network error:", err);
                setError("Network error. Please try again.");
                captchaRef.current?.reset();
            }
        });
    };

    return (
        <div className={styles.container}>
            <ParticleBackground intensity="medium" />
            <div className={styles.headerSection}>
                <Header />
            </div>
            <main className={styles.pageMain}>
                <div className={styles.containerInner}>
                    <Card className={styles.loginCard}>
                        <CardHeader>
                            <h1>Admin Login</h1>
                        </CardHeader>
                        <CardBody>
                            <form onSubmit={handleSubmit} className={styles.loginForm}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="emailInput" className={styles.label}>
                                        Email address
                                    </label>
                                    <Input
                                        id="emailInput"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="passwordInput" className={styles.label}>
                                        Password
                                    </label>
                                    <Input
                                        id="passwordInput"
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Password"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                {isCaptchaEnabled && captchaType && siteKey && (
                                    <div className={styles.captchaGroup}>
                                        <Captcha
                                            ref={captchaRef}
                                            captchaType={captchaType}
                                            siteKey={siteKey}
                                            onVerify={handleCaptchaVerify}
                                            onExpire={handleCaptchaExpire}
                                            onReset={handleCaptchaReset}
                                        />
                                    </div>
                                )}
                                <div className={styles.buttonGroup}>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="large"
                                        disabled={
                                            isLoading ||
                                            !email.trim() ||
                                            !password.trim() ||
                                            (isCaptchaEnabled && !captchaVerified)
                                        }
                                        className={styles.submitButton}
                                    >
                                        {isLoading ? "Logging in..." : "Login"}
                                    </Button>
                                </div>
                            </form>
                            {error && (
                                <div className={styles.errorAlert}>
                                    <p>{error}</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function AdminLogin() {
    return (
        <Suspense
            fallback={
                <div className={styles.container}>
                    <ParticleBackground intensity="medium" />
                    <div className={styles.headerSection}>
                        <Header />
                    </div>
                    <main className={styles.pageMain}>
                        <div className={styles.containerInner}>
                            <Card className={styles.loginCard}>
                                <CardHeader>
                                    <h1>Admin Login</h1>
                                </CardHeader>
                                <CardBody>
                                    <p>Loading...</p>
                                </CardBody>
                            </Card>
                        </div>
                    </main>
                    <Footer />
                </div>
            }
        >
            <AdminLoginContent />
        </Suspense>
    );
}
