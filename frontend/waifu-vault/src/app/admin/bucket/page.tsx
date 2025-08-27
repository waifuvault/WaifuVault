"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useBucketAuth } from "@/app/hooks/useBucketAuth";
import { useEnvironment } from "@/app/hooks/useEnvironment";
import { useLoading } from "@/app/contexts/LoadingContext";
import { Card, CardBody, CardHeader, FileBrowser, Footer, Header, ParticleBackground } from "@/app/components";
import styles from "./page.module.scss";
import type { AdminBucketDto } from "../../../../../../src/model/dto/AdminBucketDto.js";

export default function BucketAdmin() {
    const { isAuthenticated, logout } = useBucketAuth();
    const { backendRestBaseUrl } = useEnvironment();
    const { withLoading } = useLoading();

    const [bucketData, setBucketData] = useState<AdminBucketDto | null>(null);

    const fetchBucketData = useCallback(async () => {
        await withLoading(async () => {
            try {
                const bucketRes = await fetch(`${backendRestBaseUrl}/admin/bucket/`, {
                    credentials: "include",
                });

                if (bucketRes.ok) {
                    const data = await bucketRes.json();
                    setBucketData(data);
                }
            } catch (error) {
                console.error("Failed to fetch bucket data:", error);
            }
        });
    }, [backendRestBaseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDeleteFiles = useCallback(
        async (fileIds: number[]) => {
            await withLoading(async () => {
                try {
                    const response = await fetch(`${backendRestBaseUrl}/admin/bucket/deleteEntries`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(fileIds),
                        credentials: "include",
                    });

                    if (response.ok) {
                        // Refresh the bucket data
                        fetchBucketData();
                    }
                } catch (error) {
                    console.error("Failed to delete files:", error);
                }
            });
        },
        [backendRestBaseUrl, fetchBucketData], // eslint-disable-line react-hooks/exhaustive-deps
    );

    useEffect(() => {
        if (isAuthenticated) {
            fetchBucketData();
        }
    }, [isAuthenticated, fetchBucketData]);

    if (isAuthenticated !== true) {
        return null;
    }

    return (
        <div className={styles.container}>
            <ParticleBackground intensity="medium" />
            <main className={styles.pageMain}>
                <div className={styles.containerInner}>
                    <Header />
                    <Card className={styles.bucketCard}>
                        <CardHeader>
                            <div className={styles.headerContent}>
                                <div className={styles.titleSection}>
                                    <h1>Bucket Manager</h1>
                                    {bucketData && (
                                        <div className={styles.bucketToken}>
                                            <span className={styles.tokenLabel}>Token:</span>
                                            <span className={styles.tokenValue}>{bucketData.token}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <FileBrowser
                                files={bucketData?.files ?? []}
                                onDeleteFiles={handleDeleteFiles}
                                onLogout={logout}
                                showSearch={true}
                                showSort={true}
                                showViewToggle={true}
                                allowSelection={true}
                                allowDeletion={true}
                                mode="bucket"
                            />
                        </CardBody>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}
