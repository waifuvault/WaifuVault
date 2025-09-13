"use client";

import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Tooltip.module.scss";

interface TooltipProps {
    content: string;
    position?: "top" | "bottom" | "left" | "right";
    delay?: number;
    disabled?: boolean;
    className?: string;
}

export function Tooltip({
    content,
    children,
    position = "top",
    delay = 500,
    disabled = false,
    className = "",
}: PropsWithChildren<TooltipProps>) {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const targetRef = useRef<HTMLDivElement | null>(null);

    const showTooltip = () => {
        if (disabled || !content.trim()) {
            return;
        }

        timeoutRef.current = setTimeout(() => {
            if (targetRef.current) {
                const rect = targetRef.current.getBoundingClientRect();
                const scrollX = window.pageXOffset;
                const scrollY = window.pageYOffset;

                let x = rect.left + scrollX + rect.width / 2;
                let y = rect.top + scrollY;

                switch (position) {
                    case "top":
                        y = rect.top + scrollY - 8;
                        break;
                    case "bottom":
                        y = rect.bottom + scrollY + 8;
                        break;
                    case "left":
                        x = rect.left + scrollX - 8;
                        y = rect.top + scrollY + rect.height / 2;
                        break;
                    case "right":
                        x = rect.right + scrollX + 8;
                        y = rect.top + scrollY + rect.height / 2;
                        break;
                }

                setTooltipPosition({ x, y });
                setIsVisible(true);
            }
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const tooltipElement =
        isVisible && typeof window !== "undefined" ? (
            <div
                className={`${styles.tooltip} ${styles[position]} ${className}`}
                style={{
                    left: tooltipPosition.x,
                    top: tooltipPosition.y,
                }}
                role="tooltip"
                aria-hidden="false"
            >
                <div className={styles.tooltipContent}>{content}</div>
                <div className={styles.arrow} />
            </div>
        ) : null;

    return (
        <>
            <span
                ref={targetRef}
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
                className={styles.tooltipWrapper}
            >
                {children}
            </span>
            {tooltipElement && createPortal(tooltipElement, document.body)}
        </>
    );
}
