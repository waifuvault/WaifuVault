"use client";

import React, { ComponentPropsWithoutRef } from "react";
import styles from "./Button.module.scss";
import { useTheme } from "@/app/contexts";
import Link from "next/link";

interface CommonButtonProps {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "small" | "medium" | "large";
}

interface AnchorButtonProps extends CommonButtonProps, ComponentPropsWithoutRef<"a"> {
    href: string;
}

interface NativeButtonProps extends CommonButtonProps, ComponentPropsWithoutRef<"button"> {
    type?: "button" | "submit" | "reset";
}

type ButtonProps = AnchorButtonProps | NativeButtonProps;

export default function Button({
    variant = "primary",
    size = "medium",
    children,
    className = "",
    ...props
}: ButtonProps) {
    const { getThemeClass } = useTheme();
    const themeClass = getThemeClass();

    const buttonClasses = [styles.button, styles[variant], styles[size], styles[themeClass], className]
        .filter(Boolean)
        .join(" ");

    if ("href" in props) {
        return (
            <Link {...props} className={buttonClasses}>
                {children}
            </Link>
        );
    }

    return (
        <button {...props} className={buttonClasses}>
            {children}
        </button>
    );
}
