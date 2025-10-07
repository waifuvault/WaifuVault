"use client";

import React from "react";
import Link from "next/link";
import styles from "./Header.module.scss";
import ThemeSelector from "@/app/components/ThemeSelector/ThemeSelector";
import Button from "@/app/components/Button/Button";

export default function Header() {
    return (
        <header className={styles.header}>
            <Link href="/" className={styles.headerLink}>
                <span className={styles.headerTitle}>WaifuVault</span>
            </Link>
            <div className={styles.headerActions}>
                <ThemeSelector />
                <Button
                    href="https://github.com/waifuvault/WaifuVault"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary"
                    size="small"
                >
                    <i className="bi bi-github"></i>
                    Source
                </Button>
            </div>
        </header>
    );
}
