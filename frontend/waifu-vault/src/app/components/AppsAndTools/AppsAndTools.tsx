"use client";

import React from "react";
import styles from "./AppsAndTools.module.scss";
import Button from "@/app/components/Button/Button";

interface Item {
    name: string;
    description: string;
    icon: string;
    url: string;
    platform?: string;
    buttonText?: string;
}

const tools: Item[] = [
    {
        name: "Thumbnail Generator",
        description: "Blazing fast thumbnail generator that powers WaifuVault, free for anyone to use",
        icon: "bi-image",
        url: "https://thumbnails.waifuvault.moe/",
        buttonText: "Visit",
    },
];

const apps: Item[] = [
    {
        name: "Android App",
        description: "Official Android application for WaifuVault",
        icon: "bi-android2",
        url: "https://github.com/waifuvault/waifu-android-app/releases/",
        platform: "Android",
        buttonText: "Download",
    },
];

export default function AppsAndTools() {
    return (
        <div className={styles.appsAndTools}>
            <div className={styles.toolsWrapper}>
                <h2 className={styles.title}>Apps &amp; Tools</h2>
                <h6 className={styles.subtitle}>External applications and tools for WaifuVault</h6>

                <div className={styles.sectionsContainer}>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Tools</h3>
                        <div className={styles.toolsGrid}>
                            {tools.map((tool, index) => (
                                <div key={index} className={styles.toolCard}>
                                    <div className={styles.toolIcon}>
                                        <i className={tool.icon}></i>
                                    </div>
                                    <div className={styles.toolContent}>
                                        <h5 className={styles.toolTitle}>{tool.name}</h5>
                                        {tool.platform && <span className={styles.platform}>{tool.platform}</span>}
                                        <p className={styles.toolDescription}>{tool.description}</p>
                                        <Button href={tool.url} target="_blank" rel="noopener noreferrer" size="small">
                                            {tool.buttonText || "Visit"}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.divider}></div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Apps</h3>
                        <div className={styles.toolsGrid}>
                            {apps.map((app, index) => (
                                <div key={index} className={styles.toolCard}>
                                    <div className={styles.toolIcon}>
                                        <i className={app.icon}></i>
                                    </div>
                                    <div className={styles.toolContent}>
                                        <h5 className={styles.toolTitle}>{app.name}</h5>
                                        {app.platform && <span className={styles.platform}>{app.platform}</span>}
                                        <p className={styles.toolDescription}>{app.description}</p>
                                        <Button href={app.url} target="_blank" rel="noopener noreferrer" size="small">
                                            {app.buttonText || "Download"}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
