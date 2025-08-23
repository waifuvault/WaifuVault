"use client";

import React, { useState } from "react";
import styles from "./page.module.scss";
import { Button, Card, CardBody, CardHeader, Footer, Header, ParticleBackground } from "@/app/components";
import { useEnvironment } from "@/app/hooks/useEnvironment";

export default function BucketAccess() {
    const [token, setToken] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const { backendRestBaseUrl } = useEnvironment();

    const handleCreateBucket = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${backendRestBaseUrl}/bucket/create`);
            const json = await response.json();
            if (!response.ok) {
                setError(json.message);
                return;
            }
            setToken(json.token);
        } catch {
            setError("Failed to create bucket");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim()) return;

        setIsLoading(true);
        setError("");

        const form = document.createElement("form");
        form.method = "POST";
        form.action = `${backendRestBaseUrl}/auth/authenticate_bucket`;

        const tokenInput = document.createElement("input");
        tokenInput.type = "hidden";
        tokenInput.name = "token";
        tokenInput.value = token;

        form.appendChild(tokenInput);
        document.body.appendChild(form);
        form.submit();
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
