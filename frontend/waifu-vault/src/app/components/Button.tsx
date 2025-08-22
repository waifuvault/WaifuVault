"use client";

import React from "react";
import styles from "./Button.module.scss";
import { useTheme } from "@/app/contexts/ThemeContext";

interface ButtonProps {
    variant?: "primary" | "secondary" | "outline";
    size?: "small" | "medium" | "large";
    children: React.ReactNode;
    onClick?: () => void;
    href?: string;
    target?: string;
    rel?: string;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    className?: string;
}

export default function Button({
    variant = "primary",
    size = "medium",
    children,
    onClick,
    href,
    target,
    rel,
    disabled = false,
    type = "button",
    className = "",
}: ButtonProps) {
    const { getThemeClass } = useTheme();
    const themeClass = getThemeClass();

    const buttonClasses = [styles.button, styles[variant], styles[size], styles[themeClass], className]
        .filter(Boolean)
        .join(" ");

    const commonProps = {
        className: buttonClasses,
        disabled,
    };

    if (href) {
        return (
            <a href={href} target={target} rel={rel} {...commonProps}>
                {children}
            </a>
        );
    }

    return (
        <button type={type} onClick={onClick} {...commonProps}>
            {children}
        </button>
    );
}
