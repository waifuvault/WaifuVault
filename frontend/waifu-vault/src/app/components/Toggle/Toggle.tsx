"use client";

import React from "react";
import styles from "./Toggle.module.scss";

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    icon?: string;
    disabled?: boolean;
    className?: string;
}

export function Toggle({ checked, onChange, label, icon, disabled = false, className }: ToggleProps) {
    return (
        <label className={`${styles.toggleLabel} ${disabled ? styles.disabled : ""} ${className || ""}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className={styles.toggleInput}
                disabled={disabled}
            />
            <span className={styles.toggleSlider}></span>
            {(label || icon) && (
                <span className={styles.toggleText}>
                    {icon && <i className={icon} aria-hidden="true"></i>}
                    {label}
                </span>
            )}
        </label>
    );
}
