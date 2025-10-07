"use client";

import React, { ComponentPropsWithoutRef } from "react";
import styles from "./Card.module.scss";

interface CardProps extends ComponentPropsWithoutRef<"div"> {
    variant?: "default" | "elevated" | "flat";
}

export default function Card({ children, className, variant = "default" }: CardProps) {
    return <div className={`${styles.card} ${styles[variant]} ${className || ""}`}>{children}</div>;
}

export function CardHeader({ children, className }: ComponentPropsWithoutRef<"div">) {
    return <div className={`${styles.cardHeader} ${className || ""}`}>{children}</div>;
}

export function CardBody({ children, className }: ComponentPropsWithoutRef<"div">) {
    return <div className={`${styles.cardBody} ${className || ""}`}>{children}</div>;
}
