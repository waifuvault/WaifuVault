"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useEnvironment, useErrorHandler } from "@/app/hooks";
import { Button, Card, CardBody, CardHeader, Footer, Header, Input, ParticleBackground } from "@/app/components";
import styles from "./page.module.scss";

interface DownloadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export default function FileAccess() {
    const params = useParams();
    const { waifuVaultBackend } = useEnvironment();
    const { handleError } = useErrorHandler();
    const [needsPassword, setNeedsPassword] = useState<boolean | null>(null);
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

    const segments = Array.isArray(params.segments) ? params.segments : [params.segments];
    const filename = segments[1] ?? segments[0];

    const fileUrl = `${waifuVaultBackend}/f/${segments.join("/")}?check=true`;

    const checkIfPasswordNeeded = useCallback(async () => {
        try {
            const response = await fetch(fileUrl, {
                method: "HEAD",
            });

            if (response.ok) {
                window.location.href = fileUrl;
            } else if (response.status === 403) {
                setNeedsPassword(true);
                const fullResponse = await fetch(fileUrl);
                const json = await fullResponse.json();
                setIsEncrypted(json.encrypted);
            } else {
                const errorMsg = handleError(new Error("File not found or access denied"), {
                    showToast: false,
                    rethrow: false,
                });
                setError(errorMsg);
            }
        } catch (err) {
            const errorMsg = handleError(err, {
                defaultMessage: "Unable to access file",
                showToast: false,
                rethrow: false,
            });
            setError(errorMsg);
        }
    }, [fileUrl, handleError]);

    useEffect(() => {
        checkIfPasswordNeeded();
    }, [checkIfPasswordNeeded]);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim() || isDownloading) {
            return;
        }

        setError("");
        setIsDownloading(true);
        setDownloadProgress({ loaded: 0, total: 0, percentage: 0 });

        try {
            const response = await fetch(fileUrl, {
                headers: {
                    "x-password": password,
                },
            });

            if (response.status === 403) {
                const errorMsg = handleError(new Error("Password is incorrect"), {
                    showToast: false,
                    rethrow: false,
                });
                setError(errorMsg);
                return;
            }

            if (!response.ok) {
                const errorMsg = handleError(new Error("Failed to download file"), {
                    showToast: false,
                    rethrow: false,
                });
                setError(errorMsg);
                return;
            }

            const contentLength = response.headers.get("content-length");
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            let loaded = 0;

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("Unable to read response");
            }

            const chunks: Uint8Array[] = [];

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                if (value) {
                    chunks.push(value);
                    loaded += value.byteLength;

                    const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
                    setDownloadProgress({ loaded, total, percentage });
                }
            }

            const contentType = response.headers.get("content-type") || "application/octet-stream";
            const blob = new Blob(chunks as BlobPart[], { type: contentType });

            const dispositionHeader = response.headers.get("content-disposition");
            let downloadFilename = filename;
            if (dispositionHeader) {
                const filenameMatch = dispositionHeader.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    downloadFilename = filenameMatch[1].replace(/['"]/g, "");
                }
            }

            const file = new File([blob], downloadFilename || "download", { type: contentType });
            const url = window.URL.createObjectURL(file);

            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

            if (isSafari) {
                const a = document.createElement("a");
                document.body.appendChild(a);
                a.style.display = "none";
                a.href = url;
                a.download = downloadFilename || "download";
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                window.open(url, "_blank")?.focus();
            }
        } catch (err) {
            const errorMsg = handleError(err, {
                defaultMessage: "Download failed",
                showToast: false,
                rethrow: false,
            });
            setError(errorMsg);
        } finally {
            setIsDownloading(false);
            setDownloadProgress(null);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handlePasswordSubmit(e as React.FormEvent);
        }
    };

    if (needsPassword === null) {
        return (
            <div className={styles.container}>
                <ParticleBackground intensity="medium" />
                <div className={styles.headerSection}>
                    <Header />
                </div>
                <main className={styles.pageMain}>
                    <div className={styles.containerInner}>
                        <Card className={styles.accessCard}>
                            <CardBody>
                                <div className={styles.loading}>
                                    <p>Checking file access...</p>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (error && !needsPassword) {
        return (
            <div className={styles.container}>
                <ParticleBackground intensity="medium" />
                <div className={styles.headerSection}>
                    <Header />
                </div>
                <main className={styles.pageMain}>
                    <div className={styles.containerInner}>
                        <Card className={styles.accessCard}>
                            <CardHeader>
                                <h1>File Access Error</h1>
                            </CardHeader>
                            <CardBody>
                                <div className={styles.errorState}>
                                    <p>{error}</p>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <ParticleBackground intensity="medium" />
            <div className={styles.headerSection}>
                <Header />
            </div>
            <main className={styles.pageMain}>
                <div className={styles.containerInner}>
                    <Card className={styles.accessCard}>
                        <CardHeader>
                            <h1>{isEncrypted ? "Encrypted file" : "Password-protected file"}</h1>
                        </CardHeader>
                        <CardBody>
                            <div className={styles.warning}>
                                <i className="bi bi-exclamation-triangle"></i>
                                <p>Ensure popups are allowed to view this content</p>
                            </div>

                            <form onSubmit={handlePasswordSubmit} className={styles.passwordForm}>
                                <div className={styles.formGroup}>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Password"
                                        required
                                        disabled={isDownloading}
                                        className={styles.passwordInput}
                                    />
                                </div>

                                {error && (
                                    <div className={styles.errorAlert}>
                                        <p>{error}</p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="large"
                                    disabled={isDownloading || !password.trim()}
                                    className={styles.accessButton}
                                >
                                    {isDownloading ? "Downloading..." : "Gain access"}
                                </Button>
                            </form>

                            {downloadProgress && (
                                <div className={styles.progressWrapper}>
                                    <div className={styles.progressBar}>
                                        <div
                                            className={styles.progressFill}
                                            style={{ width: `${downloadProgress.percentage}%` }}
                                        >
                                            {downloadProgress.percentage}%
                                        </div>
                                    </div>
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
