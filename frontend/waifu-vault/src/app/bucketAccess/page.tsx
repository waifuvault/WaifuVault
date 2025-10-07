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
import { useBucketAuth, useCaptcha, useEnvironment } from "@/app/hooks";
import { useBucketAuthContext, useLoading } from "@/app/contexts";
import { getCaptchaBodyKey } from "@/app/utils/captchaUtils";

function BucketAccessContent() {
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const captchaRef = useRef<CaptchaHandle>(null);
    const { backendRestBaseUrl } = useEnvironment();
    const { isAuthenticated } = useBucketAuth();
    const { setIsAuthenticated } = useBucketAuthContext();
    const { withLoading, isLoading } = useLoading();
    const { captchaType, siteKey, isEnabled: isCaptchaEnabled } = useCaptcha();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (isAuthenticated === true) {
            router.replace("/admin/bucket");
            return;
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        const errorParam = searchParams.get("error");
        if (errorParam === "invalid_token") {
            setError("Invalid or expired token. Please enter your bucket token to continue.");
        } else if (errorParam === "no_token") {
            setError("No bucket token provided. Please enter your bucket token below or create a new bucket.");
        }
    }, [searchParams]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get("error");
        if (errorParam === "invalid_token") {
            setError("Invalid or expired token. Please enter your bucket token to continue.");
        } else if (errorParam === "no_token") {
            setError("No bucket token provided. Please enter your bucket token below or create a new bucket.");
        }
    }, []);

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

    const handleCreateBucket = async () => {
        await withLoading(async () => {
            try {
                const response = await fetch(`${backendRestBaseUrl}/bucket/create`);
                const json = await response.json();
                if (!response.ok) {
                    setError(json.message);
                    return;
                }
                setToken(json.token);
            } catch {
                setError("Failed to create bucket");
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim()) {
            return;
        }

        setError("");

        try {
            const requestBody: Record<string, string> = { token };

            if (isCaptchaEnabled && captchaToken && captchaType) {
                const captchaKey = getCaptchaBodyKey(captchaType);
                if (captchaKey) {
                    requestBody[captchaKey] = captchaToken;
                }
            }

            const response = await fetch(`${backendRestBaseUrl}/auth/authenticate_bucket`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
                credentials: "include",
            });

            if (response.ok) {
                setIsAuthenticated(true);
                router.push("/admin/bucket");
            } else {
                const errorData = await response.json().catch(() => {
                    return { message: "Authentication failed" };
                });
                setError(errorData.message || "Authentication failed");
                captchaRef.current?.reset();
            }
        } catch (err) {
            console.log("Network error:", err);
            setError("Network error. Please try again.");
            captchaRef.current?.reset();
        }
    };

    return (
        <div className={styles.container}>
            <ParticleBackground intensity="medium" />
            <div className={styles.headerSection}>
                <Header />
            </div>
            <main className={styles.pageMain}>
                <div className={styles.containerInner}>
                    <Card className={styles.bucketCard}>
                        <CardHeader>
                            <h1>Bucket Access</h1>
                        </CardHeader>
                        <CardBody>
                            <div className={styles.infoAlert}>
                                <p>
                                    Buckets are virtual collections of files, accessible via a private token. <br />
                                    Once created, you can upload and manage files and create albums.
                                </p>
                            </div>
                            <div className={styles.lightAlert}>
                                <p>
                                    You can create a bucket by clicking &#34;Create bucket&#34; below (no signup
                                    required).
                                </p>
                            </div>
                            <form onSubmit={handleSubmit} className={styles.bucketForm}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="tokenInput" className={styles.label}>
                                        Bucket token
                                    </label>
                                    <Input
                                        id="tokenInput"
                                        type="text"
                                        value={token}
                                        onChange={e => setToken(e.target.value)}
                                        placeholder="Bucket token"
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
                                        disabled={isLoading || !token.trim() || (isCaptchaEnabled && !captchaVerified)}
                                        className={styles.submitButton}
                                    >
                                        {isLoading ? "Authenticating..." : "Gain Access"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="large"
                                        onClick={handleCreateBucket}
                                        disabled={isLoading}
                                        className={styles.createButton}
                                    >
                                        {isLoading ? "Creating..." : "Create Bucket"}
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

export default function BucketAccess() {
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
                            <Card className={styles.bucketCard}>
                                <CardHeader>
                                    <h1>Bucket Access</h1>
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
            <BucketAccessContent />
        </Suspense>
    );
}
