"use client";

import React from "react";
import styles from "./PrivacyPolicy.module.scss";
import Button from "@/app/components/Button/Button";

export default function PrivacyPolicy() {
    return (
        <div className={styles.privacyPolicy}>
            <div className={styles.privacyContent}>
                <h2 className={styles.title}>Privacy Policy</h2>

                <div className={styles.policyText}>
                    <p>
                        No data is shared with third parties, and data will be deleted permanently when the file expires
                        or is deleted by the user
                    </p>

                    <p>
                        If we believe the release of this information is necessary to respond to a legal process, to
                        investigate or remedy potential violations of our policies, or to protect the rights, property,
                        and safety of others, we may share your information as permitted or required by any applicable
                        law, rule, or regulation.
                    </p>

                    <p>
                        No uniform technology standard for recognising and implementing Do-Not-Track(DNT) signals has
                        been finalised. As such, we do not currently respond to DNT browser signals or any other
                        mechanism that automatically communicates your choice not to be tracked online.
                    </p>

                    <p>
                        While we have taken reasonable steps to secure any information you provide to us, please be
                        aware that despite our efforts, no security measures are perfect or impenetrable. No method of
                        data transmission can be guaranteed against any interception or other type of misuse. Any
                        information disclosed online is potentially vulnerable to interception and misuse by
                        unauthorised parties.
                    </p>
                </div>

                <div className={styles.ipHashingInfo}>
                    <div className={styles.alert}>
                        <p>
                            <strong>IP Address Handling:</strong>
                        </p>
                        <p>We securely hash your IP address using SHA-256.</p>
                        <p>This hash is only used for bucket validation and is never stored in plain text or logged.</p>
                        <p>Even we cannot access or determine what your original IP address is.</p>
                        <p>We also do not request, log, or retain any personal information from you.</p>
                    </div>
                </div>

                <div className={styles.contactSection}>
                    <Button
                        href="mailto:victoria@waifuvault.moe"
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        variant="secondary"
                    >
                        Contact me if you have any issues
                    </Button>
                </div>
            </div>
        </div>
    );
}
