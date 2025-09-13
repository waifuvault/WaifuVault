"use client";

import React, { DragEvent, useEffect, useState } from "react";
import { FilePreview } from "@/app/components";
import { formatFileSize, validateExpires } from "../../utils/upload";
import { useRestrictions } from "../../hooks/useRestrictions";
import { useEnvironment } from "../../hooks/useEnvironment";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import * as uploadApi from "../../utils/api/uploadApi";
import AdvancedDropZone from "../AdvancedDropZone/AdvancedDropZone";
import Button from "../Button/Button";
import { Input } from "../Input/Input";
import { UploadFile } from "../../types/upload";
import { BucketType } from "../../utils/api/bucketApi";
import styles from "./FileUpload.module.scss";

interface FileUploadProps {
    bucketToken?: string;
    albumToken?: string;
    currentAlbumFileCount?: number;
    bucketType?: BucketType;
    onUploadComplete?: (files: UploadFile[]) => void;
    onUploadProgress?: (progress: number) => void;
    shouldReset?: boolean;
}

let fileCounter = 0;

export const FileUpload = ({
    bucketToken,
    albumToken,
    currentAlbumFileCount = 0,
    bucketType,
    onUploadComplete,
    shouldReset,
}: FileUploadProps) => {
    const { restrictions, bannedTypes, isLoading: restrictionsLoading } = useRestrictions();
    const { backendRestBaseUrl } = useEnvironment();
    const { handleError } = useErrorHandler();
    const [isDragging, setIsDragging] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadOptions, setUploadOptions] = useState({
        expires: "",
        password: "",
        hideFilename: false,
        oneTimeDownload: false,
    });
    const [expiresError, setExpiresError] = useState<string | null>(null);

    const validateFile = (file: File): { isValid: boolean; error?: string } => {
        if (file.size > restrictions.maxFileSize) {
            return {
                isValid: false,
                error: `File too large (${formatFileSize(file.size)}). Max: ${formatFileSize(restrictions.maxFileSize)}`,
            };
        }

        if (bannedTypes.includes(file.type)) {
            return {
                isValid: false,
                error: `File type not allowed: ${file.type}`,
            };
        }

        return { isValid: true };
    };

    const processFiles = (files: FileList | File[]) => {
        const fileArray = Array.from(files);

        if (albumToken && bucketType !== "PREMIUM") {
            const totalFiles = currentAlbumFileCount + uploadFiles.length + fileArray.length;
            if (totalFiles > restrictions.maxAlbumSize) {
                const remainingSlots = restrictions.maxAlbumSize - currentAlbumFileCount - uploadFiles.length;
                const filesInAlbum =
                    currentAlbumFileCount > 0 ? ` (album currently has ${currentAlbumFileCount} files)` : "";
                handleError(
                    new Error(
                        `Album file limit exceeded. You can only upload ${Math.max(0, remainingSlots)} more files (maximum ${restrictions.maxAlbumSize} files per album)${filesInAlbum}.`,
                    ),
                    { rethrow: false },
                );
                return;
            }
        }

        const processedFiles: UploadFile[] = fileArray.map((file, index) => {
            const validation = validateFile(file);
            return {
                id: `${file.name}-${file.size}-${Date.now()}-${++fileCounter}-${index}`,
                file,
                isValid: validation.isValid,
                error: validation.error,
                status: "pending" as const,
                progress: 0,
            };
        });

        setUploadFiles(prev => [...prev, ...processedFiles]);
    };

    const handleDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const dropzoneElement = e.currentTarget as HTMLElement;
        const relatedTarget = e.relatedTarget as HTMLElement;

        if (!relatedTarget || !dropzoneElement.contains(relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files?.length) {
            processFiles(files);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files?.length) {
            processFiles(files);
        }
        e.target.value = "";
    };

    const removeFile = (id: string) => {
        setUploadFiles(prev => prev.filter(f => f.id !== id));
    };

    const clearAllFiles = () => {
        setUploadFiles([]);
    };

    const resetComponent = () => {
        setUploadFiles([]);
        setIsDragging(false);
        setIsUploading(false);
        setUploadOptions({
            expires: "",
            password: "",
            hideFilename: false,
            oneTimeDownload: false,
        });
        setExpiresError(null);
    };

    useEffect(() => {
        if (shouldReset) {
            resetComponent();
        }
    }, [shouldReset]);

    const toggleOptions = (id: string) => {
        setUploadFiles(prev => prev.map(item => (item.id === id ? { ...item, showOptions: !item.showOptions } : item)));
    };

    const handleExpiresChange = (value: string) => {
        setUploadOptions(prev => ({ ...prev, expires: value }));

        if (value === "" || validateExpires(value)) {
            setExpiresError(null);
        } else {
            setExpiresError("Format: number + m/h/d (e.g., 1h, 30m, 2d)");
        }
    };

    const uploadFile = async (uploadFile: UploadFile): Promise<UploadFile> => {
        try {
            setUploadFiles(prev =>
                prev.map(f => {
                    return f.id === uploadFile.id ? { ...f, status: "uploading" } : f;
                }),
            );

            const response = await uploadApi.uploadFile(
                backendRestBaseUrl,
                uploadFile.file,
                {
                    expires: uploadOptions.expires,
                    password: uploadOptions.password,
                    hideFilename: uploadOptions.hideFilename,
                    oneTimeDownload: uploadOptions.oneTimeDownload,
                },
                bucketToken,
                progress => {
                    setUploadFiles(prev =>
                        prev.map(f => {
                            return f.id === uploadFile.id ? { ...f, progress } : f;
                        }),
                    );
                },
            );

            console.log(`Upload successful for ${uploadFile.file.name}:`, response);
            return {
                ...uploadFile,
                status: "completed",
                response,
            };
        } catch (error) {
            handleError(error, { defaultMessage: `Upload failed for ${uploadFile.file.name}` });
            return {
                ...uploadFile,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
            };
        }
    };

    const startUpload = async () => {
        const validFiles = uploadFiles.filter(f => f.isValid && (f.status === "pending" || f.status === "error"));
        if (validFiles.length === 0) {
            return;
        }

        setUploadFiles(prev =>
            prev.map(f => (f.status === "error" && f.isValid ? { ...f, status: "pending", progress: 0 } : f)),
        );

        setIsUploading(true);

        try {
            const uploadPromises = validFiles.map(uploadFile);
            const results = await Promise.all(uploadPromises);

            setUploadFiles(prev =>
                prev.map(existing => {
                    const result = results.find(r => r.id === existing.id);
                    return result || existing;
                }),
            );

            onUploadComplete?.(results);
        } catch (error) {
            handleError(error, { defaultMessage: "Upload process failed" });
        } finally {
            setIsUploading(false);
        }
    };

    const uploadableFiles = uploadFiles.filter(f => f.isValid && (f.status === "pending" || f.status === "error"));
    const hasValidationErrors = expiresError !== null;
    const isAtFileLimit = Boolean(
        albumToken &&
            bucketType !== "PREMIUM" &&
            currentAlbumFileCount + uploadFiles.length >= restrictions.maxAlbumSize,
    );

    if (restrictionsLoading) {
        return (
            <div className={styles.fileUpload}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>Loading upload restrictions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.fileUpload}>
            <AdvancedDropZone
                isDragging={isDragging}
                maxFileSize={restrictions.maxFileSize}
                disabled={isAtFileLimit}
                bucketType={bucketType}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onFileSelect={handleFileSelect}
            />

            {uploadFiles.length > 0 && (
                <div className={styles.uploadSection}>
                    <div className={styles.uploadHeader}>
                        <h4>Upload Queue</h4>
                        <div className={styles.uploadActions}>
                            <Button
                                variant="primary"
                                onClick={startUpload}
                                disabled={isUploading || uploadableFiles.length === 0 || hasValidationErrors}
                            >
                                Upload {uploadableFiles.length} Files
                            </Button>
                            <Button variant="secondary" onClick={clearAllFiles} disabled={isUploading}>
                                Clear All
                            </Button>
                        </div>
                    </div>

                    {hasValidationErrors && (
                        <div className={styles.globalValidationError}>
                            <i className="bi bi-exclamation-triangle"></i>
                            <div>
                                <strong>Fix the following errors before uploading:</strong>
                                <ul>{expiresError && <li>{expiresError}</li>}</ul>
                            </div>
                        </div>
                    )}

                    <div className={styles.fileList}>
                        {uploadFiles.map(uploadFile => (
                            <div key={uploadFile.id}>
                                <div className={`${styles.fileItem} ${!uploadFile.isValid ? styles.invalid : ""}`}>
                                    <div className={styles.filePreview}>
                                        <FilePreview file={uploadFile.file} size="small" />
                                    </div>
                                    <div className={styles.fileInfo}>
                                        <div className={styles.fileName}>{uploadFile.file.name}</div>
                                        <div className={styles.fileSize}>{formatFileSize(uploadFile.file.size)}</div>
                                        {uploadFile.error && (
                                            <div
                                                className={`${styles.fileError} ${uploadFile.status === "error" ? styles.uploadError : ""}`}
                                            >
                                                {uploadFile.status === "error" && (
                                                    <i
                                                        className="bi bi-exclamation-triangle"
                                                        style={{ marginRight: "0.25rem" }}
                                                    ></i>
                                                )}
                                                {uploadFile.error}
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.fileStatus}>
                                        {uploadFile.status === "pending" && uploadFile.isValid && (
                                            <i className="bi bi-clock" style={{ color: "var(--text-secondary)" }}></i>
                                        )}
                                        {uploadFile.status === "uploading" && (
                                            <div className={styles.progressContainer}>
                                                <div className={styles.progress}>
                                                    <div
                                                        className={styles.progressBar}
                                                        style={{ width: `${uploadFile.progress || 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className={styles.progressText}>{uploadFile.progress || 0}%</span>
                                            </div>
                                        )}
                                        {uploadFile.status === "completed" && (
                                            <i
                                                className="bi bi-check-circle"
                                                style={{ color: "var(--success-color)" }}
                                                title="Upload completed"
                                            ></i>
                                        )}
                                        {uploadFile.status === "error" && (
                                            <div className={styles.errorStatus}>
                                                <i
                                                    className="bi bi-exclamation-circle"
                                                    style={{ color: "var(--error-color)" }}
                                                    title={uploadFile.error || "Upload failed"}
                                                ></i>
                                                <span className={styles.errorText}>Failed</span>
                                            </div>
                                        )}
                                        {!uploadFile.isValid && (
                                            <div className={styles.errorStatus}>
                                                <i
                                                    className="bi bi-x-circle"
                                                    style={{ color: "var(--error-color)" }}
                                                    title={uploadFile.error || "Invalid file"}
                                                ></i>
                                                <span className={styles.errorText}>Invalid</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.fileActions}>
                                        {uploadFile.status === "pending" && (
                                            <Button
                                                variant="ghost"
                                                size="small"
                                                onClick={() => toggleOptions(uploadFile.id)}
                                                disabled={isUploading}
                                                title="Toggle upload options"
                                            >
                                                <i
                                                    className={`bi ${uploadFile.showOptions ? "bi-chevron-up" : "bi-gear"}`}
                                                ></i>
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="small"
                                            onClick={() => removeFile(uploadFile.id)}
                                            disabled={isUploading}
                                            title="Remove file"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </Button>
                                    </div>
                                </div>
                                {uploadFile.showOptions && uploadFile.status === "pending" && (
                                    <div className={styles.fileOptionsPanel}>
                                        <h5>Upload Options for {uploadFile.file.name}</h5>
                                        <div className={styles.fileOptionsContent}>
                                            <div className={styles.optionGroup}>
                                                <label className={styles.optionLabel}>Password</label>
                                                <Input
                                                    type="password"
                                                    placeholder="Optional password for this file"
                                                    value={uploadOptions.password}
                                                    onChange={e =>
                                                        setUploadOptions(prev => ({
                                                            ...prev,
                                                            password: e.target.value,
                                                        }))
                                                    }
                                                    disabled={isUploading}
                                                />
                                            </div>
                                            <div className={styles.optionGroup}>
                                                <label className={styles.optionLabel}>Expires</label>
                                                <Input
                                                    type="text"
                                                    placeholder="e.g. 3d, 5h, 10m"
                                                    value={uploadOptions.expires}
                                                    onChange={e => handleExpiresChange(e.target.value)}
                                                    disabled={isUploading}
                                                    error={!!expiresError}
                                                />
                                                {expiresError && (
                                                    <div className={styles.validationError}>{expiresError}</div>
                                                )}
                                            </div>
                                            <div className={styles.checkboxGroup}>
                                                <label className={styles.checkboxLabel}>
                                                    <input
                                                        type="checkbox"
                                                        checked={uploadOptions.hideFilename}
                                                        onChange={e =>
                                                            setUploadOptions(prev => ({
                                                                ...prev,
                                                                hideFilename: e.target.checked,
                                                            }))
                                                        }
                                                        disabled={isUploading}
                                                        className={styles.checkbox}
                                                    />
                                                    <span className={styles.checkboxText}>Hide filename in URL</span>
                                                </label>
                                            </div>
                                            <div className={styles.checkboxGroup}>
                                                <label className={styles.checkboxLabel}>
                                                    <input
                                                        type="checkbox"
                                                        checked={uploadOptions.oneTimeDownload}
                                                        onChange={e =>
                                                            setUploadOptions(prev => ({
                                                                ...prev,
                                                                oneTimeDownload: e.target.checked,
                                                            }))
                                                        }
                                                        disabled={isUploading}
                                                        className={styles.checkbox}
                                                    />
                                                    <span className={styles.checkboxText}>
                                                        One-time download (delete after first access)
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
