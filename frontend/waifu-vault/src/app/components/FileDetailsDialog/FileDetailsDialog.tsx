"use client";

import React from "react";
import { Dialog } from "@/app/components";
import { FileWrapper } from "@/app/types";
import styles from "./FileDetailsDialog.module.scss";

interface FileDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    file: FileWrapper | null;
}

export function FileDetailsDialog({ isOpen, onClose, file }: FileDetailsDialogProps) {
    if (!file) {
        return null;
    }

    const formatFileSize = (bytes: number): string => {
        const units = ["B", "KB", "MB", "GB", "TB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    };

    const formatDate = (date: Date | string | number): string => {
        if (!date || date === null || date === undefined) {
            return "N/A";
        }

        try {
            const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;

            // Check if the date is valid
            if (isNaN(dateObj.getTime())) {
                return "Invalid Date";
            }

            return dateObj.toLocaleString();
        } catch {
            return "Invalid Date";
        }
    };

    const formatExpires = (expires: Date | string | number | null): string => {
        // Handle null, undefined, empty string, "null" string
        if (!expires || expires === null || expires === undefined || expires === "" || expires === "null") {
            return "Never (Unlimited)";
        }

        // Check if it's a duration string (contains "days", "hours", "minutes", "seconds")
        if (
            typeof expires === "string" &&
            (expires.includes("days") || expires.includes("hours") || expires.includes("minutes"))
        ) {
            return `In ${expires}`;
        }

        return formatDate(expires);
    };

    const getFileProtectionLevel = (): string => {
        const rawFile = file.raw;
        if ("fileProtectionLevel" in rawFile) {
            return rawFile.fileProtectionLevel || "None";
        }
        return file.isProtected ? "Protected" : "None";
    };

    const detailFields = [
        { label: "ID", value: file.id.toString() },
        { label: "File Name", value: file.renameableName || "N/A" },
        { label: "File Extension", value: file.fileExtension || "N/A" },
        { label: "Original Name", value: file.fileName || "N/A" },
        { label: "Media Type", value: file.mediaType || "N/A" },
        { label: "File Size", value: formatFileSize(file.fileSize) },
        { label: "File Protection Level", value: getFileProtectionLevel() },
        { label: "Created At", value: formatDate(file.createdAt) },
        { label: "Expires", value: formatExpires(file.expires) },
        { label: "IP", value: file.ip || "N/A" },
        { label: "URL", value: file.url || "N/A" },
        { label: "Bucket", value: file.raw && "bucket" in file.raw ? file.raw.bucket || "N/A" : "N/A" },
        { label: "Views", value: file.raw && "views" in file.raw ? file.raw.views?.toString() || "0" : "0" },
        {
            label: "One Time Download",
            value: file.raw && "oneTimeDownload" in file.raw ? (file.raw.oneTimeDownload ? "Yes" : "No") : "N/A",
        },
        { label: "Album", value: file.albumName || "N/A" },
        { label: "File Token", value: file.fileToken || "N/A" },
    ];

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="File Details" size="large">
            <div className={styles.fileDetailsContent}>
                <div className={styles.detailsGrid}>
                    {detailFields.map((field, index) => (
                        <div key={index} className={styles.detailRow}>
                            <div className={styles.detailLabel}>{field.label}:</div>
                            <div className={styles.detailValue}>
                                {field.label === "URL" && field.value !== "N/A" ? (
                                    <a
                                        href={field.value}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.urlLink}
                                    >
                                        {field.value}
                                        <i className="bi bi-box-arrow-up-right" />
                                    </a>
                                ) : (
                                    <span className={field.value === "N/A" ? styles.naValue : ""}>{field.value}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Dialog>
    );
}
