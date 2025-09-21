"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.scss";
import { Button, Card, CardBody, CardHeader, Footer, Header, Input, ParticleBackground } from "@/app/components";
import { useEnvironment } from "@/app/hooks";
import { useAdminAuthContext, useLoading } from "@/app/contexts";

function AdminLoginContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { backendRestBaseUrl } = useEnvironment();
    const { withLoading, isLoading } = useLoading();
    const { setIsAuthenticated } = useAdminAuthContext();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const errorParam = searchParams.get("error");
        if (errorParam === "invalid_credentials") {
            setError("Invalid email or password. Please try again.");
        } else if (errorParam === "unauthorized") {
            setError("You are not authorized to access this area.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            return;
        }

        setError("");

        await withLoading(async () => {
            try {
                const response = await fetch(`${backendRestBaseUrl}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                    credentials: "include",
                });

                if (response.ok) {
                    setIsAuthenticated(true);
                    router.push("/admin");
                } else {
                    const errorData = await response.json().catch(() => {
                        return { message: "Authentication failed" };
                    });
                    setError(errorData.message || "Authentication failed");
                }
            } catch (err) {
                console.log("Network error:", err);
                setError("Network error. Please try again.");
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
                                <div className={styles.buttonGroup}>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="large"
                                        disabled={isLoading || !email.trim() || !password.trim()}
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
