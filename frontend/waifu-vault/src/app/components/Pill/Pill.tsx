"use client";

import React from "react";
import styles from "./Pill.module.scss";

export type PillVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "info";
export type PillSize = "small" | "medium" | "large";

interface PillProps {
    text: string;
    variant?: PillVariant;
    size?: PillSize;
    className?: string;
    icon?: React.ReactNode;
    tooltip?: boolean;
}

export default function Pill({
    text,
    variant = "primary",
    size = "medium",
    className = "",
    icon,
    tooltip = false,
}: PillProps) {
    const pillClasses = [styles.pill, styles[variant], styles[size], className].filter(Boolean).join(" ");

    return (
        <span className={pillClasses} {...(tooltip && { title: text })}>
            {icon && <span className={styles.icon}>{icon}</span>}
            <span className={styles.text}>{text}</span>
        </span>
    );
}
