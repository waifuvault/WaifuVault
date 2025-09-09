"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import styles from "./Input.module.scss";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    variant?: "default" | "search";
    error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, variant = "default", error = false, ...props }, ref) => {
        return (
            <input
                className={`${styles.input} ${styles[variant]} ${error ? styles.error : ""} ${className || ""}`}
                ref={ref}
                {...props}
            />
        );
    },
);

Input.displayName = "Input";
