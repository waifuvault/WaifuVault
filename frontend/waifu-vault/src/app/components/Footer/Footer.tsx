"use client";

import React from "react";
import styles from "./Footer.module.scss";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContent}>
                <p>&copy; {new Date().getFullYear()} WaifuVault. All Rights Reserved.</p>
                <small>
                    Built with ❤️ By{" "}
                    <a href="https://x.com/VictoriqueM" target="_blank" rel="noopener noreferrer">
                        Victoria
                    </a>{" "}
                    and{" "}
                    <a href="https://x.com/NakedMCSE" target="_blank" rel="noopener noreferrer">
                        Walker
                    </a>
                </small>
            </div>
        </footer>
    );
}
