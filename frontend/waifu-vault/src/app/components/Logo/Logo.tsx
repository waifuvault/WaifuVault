import React from "react";
import Image from "next/image";
import styles from "./Logo.module.scss";

export default function Logo() {
    return (
        <div className={styles.logoSection}>
            <div className={styles.logoContainer}>
                <Image
                    src="https://waifuvault.moe/assets/custom/images/vic_vault.webp"
                    alt="WaifuVault Logo"
                    width={300}
                    height={300}
                    className={styles.logo}
                    priority
                />
            </div>
            <div className={styles.logoCredit}>
                <small>
                    Logo lovingly created by{" "}
                    <a href="https://twitch.tv/meru" target="_blank" className={styles.link} rel="noopener noreferrer">
                        Meru
                    </a>
                </small>
            </div>
        </div>
    );
}
