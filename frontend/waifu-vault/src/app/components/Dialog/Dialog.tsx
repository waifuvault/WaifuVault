import React from "react";
import styles from "./Dialog.module.scss";
import { useTheme } from "@/app/contexts/ThemeContext";

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export default function Dialog({ isOpen, onClose, title, children, maxWidth = "400px" }: DialogProps) {
    const { getThemeClass } = useTheme();

    if (!isOpen) {
        return null;
    }

    const themeClass = getThemeClass();

    return (
        <div className={`${styles.overlay} ${styles[themeClass]}`} onClick={onClose}>
            <div
                className={`${styles.modal} ${styles[themeClass]}`}
                onClick={e => e.stopPropagation()}
                style={{ maxWidth }}
            >
                <div className={styles.header}>
                    <h3 className={styles.title}>{title}</h3>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Close dialog">
                        <i className="bi-x-lg" aria-hidden="true"></i>
                    </button>
                </div>

                <div className={styles.content}>{children}</div>
            </div>
        </div>
    );
}
