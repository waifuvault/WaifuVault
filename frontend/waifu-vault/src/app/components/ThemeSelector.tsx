"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./ThemeSelector.module.scss";
import { localStoreThemeKey, useTheme } from "@/app/contexts/ThemeContext";
import { ThemeType } from "@/app/constants/theme";

export default function ThemeSelector() {
    const { currentTheme, setTheme, themes, particlesEnabled, setParticlesEnabled } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem(localStoreThemeKey) as ThemeType;
        if (saved && themes.some(theme => theme.id === saved)) {
            setTheme(saved);
            document.documentElement.dataset.theme = saved;
        }
    }, [setTheme, themes]);

    const handleThemeChange = (themeId: ThemeType) => {
        setTheme(themeId);
        document.documentElement.dataset.theme = themeId;
        localStorage.setItem("waifuvault-theme", themeId);
        setIsOpen(false);
    };

    const calculatePopupPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setPopupPosition({
                top: rect.bottom + scrollTop + 8,
                right: window.innerWidth - rect.right,
            });
        }
    };

    const toggleOpen = () => {
        if (!isOpen) {
            calculatePopupPosition();
        }
        setIsOpen(!isOpen);
    };

    const currentThemeData = themes.find(theme => theme.id === currentTheme) ?? themes[0];

    return (
        <div className={styles.themeSelector}>
            <button
                ref={buttonRef}
                aria-expanded={isOpen}
                aria-label="Theme selector"
                className={styles.themeButton}
                onClick={toggleOpen}
            >
                <i aria-hidden="true" className={`${currentThemeData.icon} ${styles.themeIcon}`}></i>
                <span className={styles.themeText}>
                    <span className={styles.themeLabel}>Theme</span>
                    <span className={styles.themeSeparator}>: </span>
                    <span className={styles.themeName}>{currentThemeData.name}</span>
                </span>
                <i
                    aria-hidden="true"
                    className={`bi-chevron-down ${styles.chevron} ${isOpen ? styles.chevronUp : styles.chevronDown}`}
                ></i>
            </button>

            {isOpen && (
                <div
                    className={styles.popup}
                    style={{
                        top: `${popupPosition.top}px`,
                        right: `${popupPosition.right}px`,
                    }}
                >
                    <div className={styles.popupHeader}>
                        <h3>Choose Theme</h3>
                        <button
                            aria-label="Close theme selector"
                            className={styles.closeButton}
                            onClick={() => {
                                setIsOpen(false);
                            }}
                        >
                            <i aria-hidden="true" className="bi-x"></i>
                        </button>
                    </div>

                    <div className={styles.particleToggle}>
                        <label className={styles.toggleLabel}>
                            <input
                                type="checkbox"
                                checked={particlesEnabled}
                                onChange={e => setParticlesEnabled(e.target.checked)}
                                className={styles.toggleInput}
                            />
                            <span className={styles.toggleSlider}></span>
                            <span className={styles.toggleText}>
                                <i className="bi-stars" aria-hidden="true"></i>
                                Particle Effects
                            </span>
                        </label>
                    </div>

                    <div className={styles.themeGrid}>
                        {themes.map(theme => (
                            <button
                                className={`${styles.themeOption} ${
                                    currentTheme === theme.id ? styles.themeOptionActive : ""
                                }`}
                                key={theme.id}
                                onClick={() => {
                                    handleThemeChange(theme.id);
                                }}
                            >
                                <div className={styles.themePreview}>
                                    <div className={`${styles.themePreviewBg} ${styles[`preview${theme.id}`]}`}>
                                        <div className={styles.previewContent}>
                                            <div className={styles.previewHeader}></div>
                                            <div className={styles.previewBody}>
                                                <div className={styles.previewLine}></div>
                                                <div className={styles.previewLine}></div>
                                            </div>
                                            <div className={styles.previewButton}></div>
                                        </div>
                                    </div>
                                    <div className={styles.themePreviewIcon}>
                                        <i aria-hidden="true" className={theme.icon}></i>
                                    </div>
                                </div>

                                <div className={styles.themeInfo}>
                                    <h4>{theme.name}</h4>
                                    <p>{theme.description}</p>
                                </div>

                                {currentTheme === theme.id && (
                                    <div className={styles.activeIndicator}>
                                        <i aria-hidden="true" className="bi-check"></i>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
