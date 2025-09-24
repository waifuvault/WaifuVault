"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.scss";
import { Button, ParticleBackground } from "@/app/components";
import { useEnvironment } from "@/app/hooks";
import Image from "next/image";

export default function Blocked() {
    const router = useRouter();
    const { backendRestBaseUrl } = useEnvironment();
    const [isVerified, setIsVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const verifyBlockStatus = async () => {
            try {
                const response = await fetch(`${backendRestBaseUrl}/health/ping`, {
                    method: "GET",
                    cache: "no-cache",
                });

                if (response.status === 403) {
                    setIsVerified(true);
                } else {
                    router.replace("/");
                    return;
                }
            } catch {
                router.replace("/");
                return;
            }
            setIsLoading(false);
        };

        void verifyBlockStatus();
    }, [router, backendRestBaseUrl]);

    if (isLoading || !isVerified) {
        return (
            <div className={styles.container}>
                <ParticleBackground intensity="low" />
                <main className={styles.main}>
                    <div className={styles.content}>
                        <p>Verifying access status...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <ParticleBackground intensity="low" />
            <main className={styles.main}>
                <div className={styles.content}>
                    <div className={styles.errorCode}>403</div>
                    <h1 className={styles.title}>Access Blocked</h1>
                    <p className={styles.description}>
                        Your IP address has been temporarily restricted from accessing WaifuVault.
                    </p>

                    <div className={styles.reasonsList}>
                        <h3>This may be due to:</h3>
                        <ul>
                            <li>Suspicious or automated activity</li>
                            <li>Violation of terms of service</li>
                            <li>Security protection measures</li>
                        </ul>
                    </div>

                    <div className={styles.actions}>
                        <Button
                            href="https://github.com/waifuvault/WaifuVault/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="secondary"
                        >
                            <i className="bi bi-bug"></i>
                            Report Issue
                        </Button>
                    </div>

                    <div className={styles.helpText}>
                        <p>
                            If you believe this is an error, please wait for the restriction to be automatically lifted.
                        </p>
                    </div>
                </div>

                <div className={styles.mascot}>
                    <div className={styles.mascotImage}>
                        <Image
                            src="https://waifuvault.moe/assets/custom/images/vic_vault.webp"
                            alt="WaifuVault mascot"
                            width={200}
                            height={200}
                            priority
                            className={styles.mascotImg}
                        />
                    </div>
                    <div className={styles.speechBubble}>
                        <p>Your access got locked away in the vault!</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
