"use client";

import React from "react";
import Image from "next/image";
import styles from "./BespokeSDKs.module.scss";
import Button from "@/app/components/Button/Button";

interface SDK {
    name: string;
    description: string;
    icon: string;
    url: string;
    customStyle?: React.CSSProperties;
}

const sdks: SDK[] = [
    {
        name: "Node.js",
        description: "The official Node.js SDK",
        icon: "/icons/icons8-nodejs.svg",
        url: "https://www.npmjs.com/package/waifuvault-node-api",
    },
    {
        name: "Python",
        description: "The official Python SDK",
        icon: "/icons/icons8-python.svg",
        url: "https://pypi.org/project/waifuvault/",
    },
    {
        name: "Go",
        description: "The official Go SDK",
        icon: "/icons/gopher.svg",
        url: "https://pkg.go.dev/github.com/waifuvault/waifuVault-go-api",
        customStyle: { width: "35px", height: "auto" },
    },
    {
        name: "C#",
        description: "The official C# SDK",
        icon: "/icons/icons8-c-sharp-logo.svg",
        url: "https://www.nuget.org/packages/Waifuvault",
    },
];

const rustSDK: SDK = {
    name: "Rust",
    description: "The official Rust SDK",
    icon: "/icons/rust.svg",
    url: "https://crates.io/crates/waifuvault",
    customStyle: { width: "80px", height: "auto", marginBottom: "-26px", marginTop: "-10px" },
};

export default function BespokeSDKs() {
    return (
        <div className={styles.bespokeSDKs}>
            <div className={styles.sdkWrapper}>
                <h2 className={styles.title}>Bespoke SDKs</h2>
                <h6 className={styles.subtitle}>Official SDKs for interacting with waifuvault</h6>

                <div className={styles.sdkGrid}>
                    {sdks.map((sdk, index) => (
                        <div key={index} className={styles.sdkCard}>
                            <div className={styles.sdkIcon}>
                                <Image
                                    src={sdk.icon}
                                    alt={`${sdk.name} icon`}
                                    width={64}
                                    height={64}
                                    style={sdk.customStyle}
                                />
                            </div>
                            <div className={styles.sdkContent}>
                                <h5 className={styles.sdkTitle}>{sdk.name}</h5>
                                <p className={styles.sdkDescription}>{sdk.description}</p>
                                <Button href={sdk.url} target="_blank" rel="noopener noreferrer" size="small">
                                    {sdk.name} SDK
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.rustSDKWrapper}>
                    <div className={styles.rustSDKCard}>
                        <div className={styles.sdkIcon}>
                            <Image
                                src={rustSDK.icon}
                                alt={`${rustSDK.name} icon`}
                                width={80}
                                height={80}
                                style={rustSDK.customStyle}
                            />
                        </div>
                        <div className={styles.sdkContent}>
                            <h5 className={styles.sdkTitle}>{rustSDK.name}</h5>
                            <p className={styles.sdkDescription}>{rustSDK.description}</p>
                            <Button
                                href={rustSDK.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
                                className={styles.rustButton}
                            >
                                Rust SDK
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
