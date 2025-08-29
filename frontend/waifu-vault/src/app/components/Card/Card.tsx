"use client";

import React from "react";
import styles from "./Card.module.scss";

interface CardProps {
    children: React.ReactNode;
    className?: string;
    variant?: "default" | "elevated" | "flat";
}

export default function Card({ children, className, variant = "default" }: CardProps) {
    return <div className={`${styles.card} ${styles[variant]} ${className || ""}`}>{children}</div>;
}

interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return <div className={`${styles.cardHeader} ${className || ""}`}>{children}</div>;
}

interface CardBodyProps {
    children: React.ReactNode;
    className?: string;
}

export function CardBody({ children, className }: CardBodyProps) {
    return <div className={`${styles.cardBody} ${className || ""}`}>{children}</div>;
}
