"use client";

import React from "react";
import styles from "./page.module.scss";
import {
    AdvancedFeatures,
    AppsAndTools,
    BespokeSDKs,
    Features,
    Footer,
    Header,
    Hero,
    LegalSection,
    Logo,
    ParticleBackground,
    SDKExamples
} from "@/app/components";
import { useRestrictions, useStats } from "@/app/hooks";

type FileCounterMode = "dynamic" | "static" | "disabled";

interface AppConfig {
    HOME_PAGE_FILE_COUNTER: FileCounterMode;
}

const config: AppConfig = {
    HOME_PAGE_FILE_COUNTER: (process.env.NEXT_PUBLIC_HOME_PAGE_FILE_COUNTER as FileCounterMode) ?? "static",
};

export default function Home() {
    const { stats } = useStats(config.HOME_PAGE_FILE_COUNTER === "dynamic");
    const { maxFileSizeFormatted } = useRestrictions();

    return (
        <div className={styles.container}>
            <ParticleBackground intensity="medium" />
            <main className={styles.pageMain}>
                <div className={styles.containerInner}>
                    <Header />
                    <Logo />
                    <Hero
                        stats={stats}
                        showCounter={config.HOME_PAGE_FILE_COUNTER !== "disabled"}
                        fileSizeLimit={maxFileSizeFormatted}
                    />
                    <Features />
                    <AdvancedFeatures />
                    <AppsAndTools />
                    <BespokeSDKs />
                    <SDKExamples />
                    <LegalSection />
                </div>
            </main>
            <Footer />
        </div>
    );
}
