"use client";

import React from "react";
import styles from "./Features.module.scss";

const features = [
    {
        icon: "bi-rocket-takeoff",
        title: "Fast",
        description: "Through the use of ETags and efficient caching, rapid file access and upload.",
    },
    {
        icon: "bi-cloud-upload",
        title: "Simple",
        description:
            "Simple API access for file upload. No authorisation is required and is totally free, just upload your file.",
    },
    {
        icon: "bi-clock-history",
        title: "Temporary",
        description:
            "All files uploaded are temporary, and will be deleted once their allotted lifespan expires. Shorter lifespans can be specified at upload.",
    },
];

export default function Features() {
    return (
        <div className={styles.features}>
            <div className={styles.featureRow}>
                {features.map((feature, index) => (
                    <div key={index} className={styles.featureCard}>
                        <i className={feature.icon}></i>
                        <div className={styles.featureContent}>
                            <h5>{feature.title}</h5>
                            <p>{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
