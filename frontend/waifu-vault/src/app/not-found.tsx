"use client";

import React from "react";
import styles from "./not-found.module.scss";
import { Button, ParticleBackground } from "@/app/components";
import { useEnvironment } from "@/app/hooks";
import Image from "next/image";

export default function NotFound() {
    const { apiDocsUrl } = useEnvironment();
    return (
        <div className={styles.container}>
            <ParticleBackground intensity="low" />
            <main className={styles.main}>
                <div className={styles.content}>
                    <div className={styles.errorCode}>404</div>
                    <h1 className={styles.title}>Page Not Found</h1>
                    <p className={styles.description}>
                        The page you&#39;re looking for doesn&#39;t exist or has been moved.
                    </p>

                    <div className={styles.actions}>
                        <Button href="/" size="large" variant={"secondary"}>
                            <i className="bi bi-house-door"></i>
                            Go Home
                        </Button>

                        <Button
                            href="https://github.com/waifuvault/WaifuVault"
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="secondary"
                        >
                            <i className="bi bi-github"></i>
                            View Source
                        </Button>
                    </div>

                    <div className={styles.helpText}>
                        <p>
                            Looking for the API? Check out our{" "}
                            <a href={apiDocsUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                documentation
                            </a>
                            .
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
                        <p>Oops! This page got lost in the vault!</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
