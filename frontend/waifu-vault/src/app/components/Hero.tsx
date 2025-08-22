"use client";

import React from "react";
import styles from "./Hero.module.scss";
import { useEnvironment } from "@/app/hooks/useEnvironment";
import Button from "@/app/components/Button";

interface StatsData {
    recordCount: number;
    recordSize: string;
}

interface HeroProps {
    stats: StatsData;
    showCounter: boolean;
    fileSizeLimit: string;
}

export default function Hero({ stats, showCounter, fileSizeLimit }: HeroProps) {
    const { apiDocsUrl, bucketAccessUrl, uploadUrl } = useEnvironment();

    return (
        <>
            <div className={styles.jumbo}>
                <div className={styles.jumboContent}>
                    <h1 className={styles.title}>No Nonsense Temporary File Hosting</h1>
                    {showCounter && (
                        <h2 className={styles.subtitle}>
                            Serving <span className={styles.accent}>{stats.recordCount.toLocaleString()}</span> public
                            files totalling <span className={styles.accent}>{stats.recordSize}</span>
                        </h2>
                    )}
                    <p className={styles.description}>
                        Inspired by{" "}
                        <a href="https://0x0.st" target="_blank" className={styles.link} rel="noopener noreferrer">
                            https://0x0.st
                        </a>
                        , WaifuVault is a temporary file hosting service that allows for file uploads that are hosted
                        for a set amount of time.
                    </p>
                    <div className={styles.callToAction}>
                        <Button href={apiDocsUrl} target="_blank" rel="noopener noreferrer">
                            Api Documentation
                        </Button>
                        <Button href={bucketAccessUrl} target="_blank" rel="noopener noreferrer">
                            Bucket access
                        </Button>
                    </div>
                </div>
            </div>

            <div className={styles.uploadCta}>
                <div className={styles.uploadCtaContent}>
                    <h3 className={styles.uploadCtaTitle}>
                        <i className="bi bi-rocket-takeoff"></i>
                        Need To Share A File Fast?
                    </h3>
                    <p className={styles.uploadCtaDescription}>
                        Upload and share files up to <strong>{fileSizeLimit}</strong> - no sign-up, no expiration, just
                        quick and easy sharing!
                    </p>
                    <Button href={uploadUrl} target="_blank" rel="noopener noreferrer" size="large">
                        <i className="bi bi-upload"></i>
                        Start Sharing Now
                    </Button>
                </div>
            </div>
        </>
    );
}
