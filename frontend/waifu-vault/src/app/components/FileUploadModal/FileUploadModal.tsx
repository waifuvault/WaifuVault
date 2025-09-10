"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileUpload } from "../FileUpload/FileUpload";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useTheme } from "../../contexts/ThemeContext";
import { UploadFile } from "../../types/upload";
import styles from "./FileUploadModal.module.scss";

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    bucketToken?: string;
    albumToken?: string;
    albumName?: string;
    onUploadComplete?: (files?: UploadFile[]) => void;
}

export const FileUploadModal = ({
    isOpen,
    onClose,
    bucketToken,
    albumToken,
    albumName,
    onUploadComplete,
}: FileUploadModalProps) => {
    const { getThemeClass } = useTheme();
    const [resetTrigger, setResetTrigger] = useState(false);

    const { handleUploadComplete, isAssociatingToAlbum } = useFileUpload({
        bucketToken,
        albumToken,
        onUploadComplete: files => {
            onUploadComplete?.(files);
        },
    });

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setResetTrigger(false);
        } else {
            document.body.style.overflow = "";
            setResetTrigger(true);
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const themeClass = getThemeClass();

    const modalContent = (
        <div className={`${styles.overlay} ${styles[themeClass]}`} onClick={onClose}>
            <div className={`${styles.modal} ${styles[themeClass]}`} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        File Upload
                        {albumName && <span className={styles.albumName}> to {albumName}</span>}
                    </h3>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.infoAlert}>
                        <i className="bi bi-info-circle"></i>
                        <div>
                            <p>
                                You can upload files to your bucket by dragging and dropping them here, or by browsing
                                for files to upload.
                            </p>
                            {albumToken && (
                                <p>
                                    Files uploaded here will be automatically added to the selected album after upload
                                    completes.
                                </p>
                            )}
                        </div>
                    </div>

                    <FileUpload
                        bucketToken={bucketToken}
                        albumToken={albumToken}
                        onUploadComplete={handleUploadComplete}
                        shouldReset={resetTrigger}
                    />

                    {isAssociatingToAlbum && (
                        <div className={styles.associatingOverlay}>
                            <div className={styles.associatingSpinner}>
                                <div className={styles.spinner}></div>
                                <span>Adding files to album...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return typeof window !== "undefined" ? createPortal(modalContent, document.body) : null;
};
