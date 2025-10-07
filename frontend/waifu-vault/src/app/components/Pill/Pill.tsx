"use client";

import React from "react";
import styles from "./Pill.module.scss";
import { Tooltip } from "@/app/components";

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

    const pillContent = (
        <span className={pillClasses}>
            {icon && <span className={styles.icon}>{icon}</span>}
            <span className={styles.text}>{text}</span>
        </span>
    );

    return tooltip ? (
        <Tooltip content={text} position="top">
            {pillContent}
        </Tooltip>
    ) : (
        pillContent
    );
}
