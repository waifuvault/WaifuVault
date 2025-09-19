"use client";

import React, { useState } from "react";
import styles from "./Restrictions.module.scss";
import { useRestrictions } from "@/app/hooks";
import { getTimeLeftBySize, timeToHuman } from "@/app/utils";

export default function Restrictions() {
    const { maxFileSizeFormatted, restrictions, isLoading, error } = useRestrictions();
    const [calculatorResult, setCalculatorResult] = useState<string>("");
    const [calculatorError, setCalculatorError] = useState<string>("");

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            setCalculatorResult("");
            setCalculatorError("");
            return;
        }

        const fileSize = file.size;
        const fileSizeLimit = restrictions.maxFileSize;

        setCalculatorResult("");
        setCalculatorError("");

        if (fileSize > fileSizeLimit) {
            setCalculatorError("File too large!");
            return;
        }

        const retentionTime = getTimeLeftBySize(fileSize, fileSizeLimit);
        const humanTime = timeToHuman(retentionTime);
        setCalculatorResult(`File will be retained for: ${humanTime}`);
    };

    return (
        <div className={styles.restrictions}>
            <div className={styles.restrictionsContent}>
                <h2 className={styles.title}>Restrictions</h2>
                <p className={styles.description}>
                    The following cannot be uploaded, and any uploads in violation of this will be banned
                </p>

                <ul className={styles.restrictionsList}>
                    <li className={styles.restrictionItem}>Piracy</li>
                    <li className={styles.restrictionItem}>Extremist material</li>
                    <li className={styles.restrictionItem}>Malware</li>
                    <li className={styles.restrictionItem}>Crypto shit</li>
                    <li className={styles.restrictionItem}>Anything illegal under German Law</li>
                    <li className={styles.restrictionItem}>
                        File Limit: {isLoading ? "Loading..." : error ? "N/A" : maxFileSizeFormatted}
                    </li>
                </ul>

                <div className={styles.retentionInfo}>
                    <p>
                        The amount of time a given file is hosted for is determined by its size. Files are hosted for a
                        maximum of 365 days, with the time being shortened on a cubic curve.
                    </p>
                    <p>
                        This means for files up to about 50% of the maximum file size will get close to the maximum
                        time. All files will be retained for at LEAST 30 days
                    </p>
                    <p>Use the control below to see how long a file will be retained for</p>
                </div>

                <div className={styles.fileCalculator}>
                    <div className={styles.fileInputWrapper}>
                        <input
                            type="file"
                            id="calculateFileTime"
                            className={styles.fileInputHidden}
                            accept="*/*"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="calculateFileTime" className={styles.fileInputLabel}>
                            <i className="bi bi-upload"></i>
                            Choose File to Calculate Retention Time
                        </label>
                    </div>
                    <div className={styles.calculatorResults}>
                        {calculatorResult && (
                            <div className={`${styles.result} ${styles.success}`}>{calculatorResult}</div>
                        )}
                        {calculatorError && <div className={`${styles.result} ${styles.error}`}>{calculatorError}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
