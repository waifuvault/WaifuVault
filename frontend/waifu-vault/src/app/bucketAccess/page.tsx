"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.scss";
import { Button, Card, CardBody, CardHeader, Footer, Header, ParticleBackground } from "@/app/components";
import { useEnvironment } from "@/app/hooks/useEnvironment";
import { useBucketAuthContext } from "@/app/contexts/BucketAuthContext";
import { useLoading } from "@/app/contexts/LoadingContext";

export default function BucketAccess() {
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const { backendRestBaseUrl } = useEnvironment();
    const { setIsAuthenticated } = useBucketAuthContext();
    const { withLoading, isLoading } = useLoading();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get("error") === "no_token") {
            setError("no bucket token");
        }
    }, [searchParams]);

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
            console.log("Making request to:", `${backendRestBaseUrl}/auth/authenticate_bucket_frontend`);
            const response = await fetch(`${backendRestBaseUrl}/auth/authenticate_bucket_frontend`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
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
            }
        } catch (err) {
            console.log("Network error:", err);
            setError("Network error. Please try again.");
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
                                    <input
                                        id="tokenInput"
                                        type="text"
                                        value={token}
                                        onChange={e => setToken(e.target.value)}
                                        placeholder="Bucket token"
                                        className={styles.input}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className={styles.buttonGroup}>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="large"
                                        disabled={isLoading || !token.trim()}
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
