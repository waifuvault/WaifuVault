"use client";

import { InputHTMLAttributes, Ref } from "react";
import styles from "./Input.module.scss";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    variant?: "default" | "search";
    error?: boolean;
    ref?: Ref<HTMLInputElement>;
}

export const Input = ({ className, variant = "default", error = false, ref, ...props }: InputProps) => {
    return (
        <input
            className={`${styles.input} ${styles[variant]} ${error ? styles.error : ""} ${className || ""}`}
            ref={ref}
            {...props}
        />
    );
};
