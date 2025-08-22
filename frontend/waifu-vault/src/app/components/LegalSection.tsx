"use client";

import React from "react";
import styles from "./LegalSection.module.scss";
import Restrictions from "@/app/components/Restrictions";
import PrivacyPolicy from "@/app/components/PrivacyPolicy";

export default function LegalSection() {
    return (
        <div className={styles.legalSection}>
            <div className={styles.legalGrid}>
                <div className={styles.restrictionsColumn}>
                    <Restrictions />
                </div>
                <div className={styles.privacyColumn}>
                    <PrivacyPolicy />
                </div>
            </div>
        </div>
    );
}
