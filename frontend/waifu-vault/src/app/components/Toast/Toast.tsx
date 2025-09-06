"use client";

import React, { useEffect, useState } from "react";
import styles from "./Toast.module.scss";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
    onClose: (id: string) => void;
}

export function Toast({ id, type, title, message, duration = 4000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const showTimer = setTimeout(() => setIsVisible(true), 10);

        // Auto dismiss
        const dismissTimer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onClose(id), 300);
        }, duration);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(dismissTimer);
        };
    }, [id, duration, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
    };

    const getIcon = () => {
        switch (type) {
            case "success":
                return <i className="bi bi-check-circle-fill"></i>;
            case "error":
                return <i className="bi bi-x-circle-fill"></i>;
            case "warning":
                return <i className="bi bi-exclamation-triangle-fill"></i>;
            case "info":
            default:
                return <i className="bi bi-info-circle-fill"></i>;
        }
    };

    return (
        <div
            className={`${styles.toast} ${styles[type]} ${isVisible ? styles.visible : ""} ${isExiting ? styles.exiting : ""}`}
        >
            <div className={styles.icon}>{getIcon()}</div>
            <div className={styles.content}>
                {title && <div className={styles.title}>{title}</div>}
                <div className={styles.message}>{message}</div>
            </div>
            <button className={styles.closeButton} onClick={handleClose} aria-label="Close notification">
                <i className="bi bi-x"></i>
            </button>
        </div>
    );
}
