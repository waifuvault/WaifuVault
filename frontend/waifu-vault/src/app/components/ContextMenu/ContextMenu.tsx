"use client";

import { Fragment, ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./ContextMenu.module.scss";

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    variant?: "default" | "danger" | "primary" | "secondary";
    separator?: boolean;
}

interface ContextMenuProps {
    visible: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
    className?: string;
}

export function ContextMenu({ visible, x, y, items, onClose, className }: ContextMenuProps) {
    const contextMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!visible) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        const handleScroll = () => {
            onClose();
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("scroll", handleScroll, true);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("scroll", handleScroll, true);
        };
    }, [visible, onClose]);

    useEffect(() => {
        if (visible && contextMenuRef.current) {
            const menu = contextMenuRef.current;
            const rect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            if (x + rect.width > viewportWidth) {
                adjustedX = x - rect.width;
            }
            if (y + rect.height > viewportHeight) {
                adjustedY = y - rect.height;
            }

            adjustedX = Math.max(10, adjustedX);
            adjustedY = Math.max(10, adjustedY);

            menu.style.left = `${adjustedX}px`;
            menu.style.top = `${adjustedY}px`;
        }
    }, [visible, x, y]);

    if (!visible || typeof document === "undefined") {
        return null;
    }

    const handleItemClick = (item: ContextMenuItem) => {
        if (!item.disabled) {
            item.onClick();
            onClose();
        }
    };

    return createPortal(
        <div
            ref={contextMenuRef}
            className={`${styles.contextMenu} ${className || ""}`}
            role="menu"
            aria-label="Context menu"
        >
            {items.map((item, index) => (
                <Fragment key={item.id}>
                    {item.separator && index > 0 && <div className={styles.separator} />}
                    <button
                        className={`${styles.menuItem} ${styles[item.variant || "default"]} ${
                            item.disabled ? styles.disabled : ""
                        }`}
                        onClick={() => handleItemClick(item)}
                        disabled={item.disabled}
                        role="menuitem"
                        tabIndex={-1}
                    >
                        {item.icon && <span className={styles.icon}>{item.icon}</span>}
                        <span className={styles.label}>{item.label}</span>
                    </button>
                </Fragment>
            ))}
        </div>,
        document.body,
    );
}
