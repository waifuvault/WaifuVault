import React, { PropsWithChildren } from "react";
import { createPortal } from "react-dom";
import styles from "./Dialog.module.scss";
import { useTheme } from "@/app/contexts";

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    maxWidth?: string;
    className?: string;
}

export default function Dialog({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = "400px",
    className,
}: PropsWithChildren<DialogProps>) {
    const { getThemeClass } = useTheme();

    if (!isOpen) {
        return null;
    }

    const themeClass = getThemeClass();

    const dialogContent = (
        <div className={`${styles.overlay} ${styles[themeClass]}`} onClick={onClose}>
            <div
                className={`${styles.modal} ${styles[themeClass]} ${className || ""}`}
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

    return typeof window !== "undefined" ? createPortal(dialogContent, document.body) : null;
}
