"use client";

import React from "react";
import styles from "./page.module.scss";
import {
    AdvancedFeatures,
    BespokeSDKs,
    Features,
    Footer,
    Header,
    Hero,
    LegalSection,
    Logo,
    ParticleBackground,
    SDKExamples,
} from "@/app/components";
import { useStats } from "@/app/hooks/useStats";
import { useRestrictions } from "@/app/hooks/useRestrictions";

type FileCounterMode = "dynamic" | "static" | "disabled";

interface AppConfig {
    HOME_PAGE_FILE_COUNTER: FileCounterMode;
}

const config: AppConfig = {
    HOME_PAGE_FILE_COUNTER: (process.env.NEXT_PUBLIC_HOME_PAGE_FILE_COUNTER as FileCounterMode) ?? "static",
};

// sexy home page

export default function Home() {
    const { stats } = useStats(config.HOME_PAGE_FILE_COUNTER === "dynamic");
    const { maxFileSizeFormatted } = useRestrictions();

    return (
        <div className={styles.container}>
            <ParticleBackground intensity="medium" />
            <main>
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
                    <BespokeSDKs />
                    <SDKExamples />
                    <LegalSection />
                </div>
            </main>
            <Footer />
        </div>
    );
}
