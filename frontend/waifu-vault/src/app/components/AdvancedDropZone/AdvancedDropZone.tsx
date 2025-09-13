import React, { DragEvent, useRef, useState } from "react";
import styles from "./AdvancedDropZone.module.css";
import { formatFileSize } from "../../utils/upload";
import { FilePreview } from "../filePreview/FilePreview";
import { isTerminal, ThemeType } from "@/app/constants/theme";
import { useTheme } from "@/app/contexts/ThemeContext";
import { BucketType } from "@/app/utils/api/bucketApi";

let rippleCounter = 0;
let fileCounter = 0;

interface AdvancedDropZoneProps {
    isDragging: boolean;
    maxFileSize: number;
    disabled?: boolean;
    bucketType?: BucketType;
    onDragEnter: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface DraggedFile {
    file: File;
    id: string;
    isValid: boolean;
    error?: string;
}

export default function AdvancedDropZone({
    isDragging,
    maxFileSize,
    disabled = false,
    bucketType,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop,
    onFileSelect,
}: AdvancedDropZoneProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropzoneRef = useRef<HTMLDivElement>(null);
    const [draggedFiles, setDraggedFiles] = useState<DraggedFile[]>([]);
    const [showPreviews, setShowPreviews] = useState(false);
    const [ripples, setRipples] = useState<Array<{ id: string; x: number; y: number }>>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const { currentTheme: theme } = useTheme();

    const validateFile = (file: File): { isValid: boolean; error?: string } => {
        if (file.size > maxFileSize) {
            return {
                isValid: false,
                error: `File too large (${formatFileSize(file.size)}). Max: ${formatFileSize(maxFileSize)}`,
            };
        }

        const bannedTypes = ["application/x-dosexec", "application/x-executable"];
        if (bannedTypes.includes(file.type)) {
            return {
                isValid: false,
                error: `File type not allowed: ${file.type}`,
            };
        }

        return { isValid: true };
    };

    const handleClick = (e: React.MouseEvent) => {
        if (disabled) {
            return;
        }

        if (dropzoneRef.current) {
            const rect = dropzoneRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rippleId = `ripple-${Date.now()}-${++rippleCounter}`;

            setRipples(prev => [...prev, { id: rippleId, x, y }]);

            setTimeout(() => {
                setRipples(prev => prev.filter(r => r.id !== rippleId));
            }, 800);
        }

        fileInputRef.current?.click();
    };

    const handleDragEnter = (e: DragEvent) => {
        if (disabled) {
            return;
        }

        onDragEnter(e);

        const files = Array.from(e.dataTransfer.files || []);
        if (files.length > 0) {
            const processedFiles: DraggedFile[] = files.map((file, index) => {
                const validation = validateFile(file);
                return {
                    file,
                    id: `${file.name}-${file.size}-${Date.now()}-${++fileCounter}-${index}`,
                    isValid: validation.isValid,
                    error: validation.error,
                };
            });

            setDraggedFiles(processedFiles);
            setShowPreviews(true);
        }
    };

    const handleDragLeave = (e: DragEvent) => {
        onDragLeave(e);

        const dropzoneElement = e.currentTarget as HTMLElement;
        const relatedTarget = e.relatedTarget as HTMLElement;

        if (!relatedTarget || !dropzoneElement.contains(relatedTarget)) {
            setShowPreviews(false);
            setDraggedFiles([]);
        }
    };

    const handleDrop = (e: DragEvent) => {
        if (disabled) {
            return;
        }

        onDrop(e);
        setShowPreviews(false);
        setDraggedFiles([]);

        setIsProcessing(true);
        setUploadProgress(0);

        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsProcessing(false);
                        setUploadProgress(0);
                    }, 500);
                    return 100;
                }
                return prev + Math.random() * 20;
            });
        }, 150);
    };

    const getDropzoneClass = () => {
        let className = `${styles.dropzone} ${styles[`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`;

        if (isDragging) {
            const hasValidFiles = draggedFiles.some(f => f.isValid);
            const hasInvalidFiles = draggedFiles.some(f => !f.isValid);

            if (hasInvalidFiles && !hasValidFiles) {
                className += ` ${styles.dragError}`;
            } else if (hasValidFiles) {
                className += ` ${styles.dragValid}`;
            } else {
                className += ` ${styles.dragging}`;
            }
        }

        if (isProcessing) {
            className += ` ${styles.processing}`;
        }

        return className;
    };

    const getThemeIcon = () => {
        switch (theme) {
            case ThemeType.STEAMPUNK:
                return "bi-gear";
            case ThemeType.CYBERPUNK:
                return "bi-upload";
            case ThemeType.GREEN_PHOSPHOR:
            case ThemeType.ORANGE_PHOSPHOR:
                return "bi-terminal";
            case ThemeType.MINIMAL:
                return "bi-cloud-arrow-up";
            case ThemeType.DEFAULT:
            default:
                return "bi-cloud-upload";
        }
    };

    const getThemeMessage = () => {
        if (disabled) {
            switch (theme) {
                case ThemeType.STEAMPUNK:
                    return "Steam Conveyance Temporarily Disabled";
                case ThemeType.CYBERPUNK:
                    return "UPLOAD.EXE ACCESS DENIED";
                case ThemeType.GREEN_PHOSPHOR:
                case ThemeType.ORANGE_PHOSPHOR:
                    return "$ upload limit reached";
                case ThemeType.MINIMAL:
                    return "Upload limit reached";
                case ThemeType.DEFAULT:
                default:
                    return "Upload Limit Reached";
            }
        }

        switch (theme) {
            case ThemeType.STEAMPUNK:
                return "Steam-Powered File Conveyance";
            case ThemeType.CYBERPUNK:
                return "UPLOAD.EXE INITIALIZED";
            case ThemeType.GREEN_PHOSPHOR:
            case ThemeType.ORANGE_PHOSPHOR:
                return "$ drop files here || click to select";
            case ThemeType.MINIMAL:
                return "Drop files or click to browse";
            case ThemeType.DEFAULT:
            default:
                return "Drop Files Here Or Click To Select";
        }
    };

    return (
        <div
            ref={dropzoneRef}
            className={getDropzoneClass()}
            onClick={handleClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={onDragOver}
            onDrop={handleDrop}
        >
            <input multiple onChange={onFileSelect} ref={fileInputRef} style={{ display: "none" }} type="file" />
            {ripples.map(ripple => (
                <div
                    key={ripple.id}
                    className={styles.ripple}
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                    }}
                />
            ))}

            {isProcessing && (
                <div className={styles.processingOverlay}>
                    <div className={styles.processingSpinner}></div>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <span className={styles.processingText}>
                        {theme === ThemeType.STEAMPUNK ? "Engaging steam engines..." : "Processing files..."}{" "}
                        {Math.round(uploadProgress)}%
                    </span>
                </div>
            )}

            {showPreviews && draggedFiles.length > 0 ? (
                <div className={styles.dragPreviewContainer}>
                    <div className={styles.dragPreviewHeader}>
                        <h3 className={styles.dragPreviewTitle}>
                            {draggedFiles.filter(f => f.isValid).length > 0 && (
                                <span className={styles.validCount}>
                                    ✓ {draggedFiles.filter(f => f.isValid).length} valid
                                </span>
                            )}
                            {draggedFiles.filter(f => !f.isValid).length > 0 && (
                                <span className={styles.invalidCount}>
                                    ✗ {draggedFiles.filter(f => !f.isValid).length} invalid
                                </span>
                            )}
                        </h3>
                    </div>

                    <div className={styles.dragPreviews}>
                        {draggedFiles.slice(0, 6).map(draggedFile => (
                            <div
                                key={draggedFile.id}
                                className={`${styles.dragPreviewItem} ${
                                    !draggedFile.isValid ? styles.dragPreviewError : ""
                                }`}
                            >
                                <FilePreview file={draggedFile.file} size="small" />
                                <span className={styles.dragPreviewName}>
                                    {draggedFile.file.name.length > 15
                                        ? `${draggedFile.file.name.slice(0, 12)}...`
                                        : draggedFile.file.name}
                                </span>
                                {draggedFile.error && (
                                    <span className={styles.dragPreviewError}>{draggedFile.error}</span>
                                )}
                            </div>
                        ))}
                        {draggedFiles.length > 6 && (
                            <div className={styles.dragPreviewMore}>+{draggedFiles.length - 6} more</div>
                        )}
                    </div>

                    <p className={styles.dropInstruction}>
                        {draggedFiles.some(f => f.isValid) ? (
                            <span className={styles.dropInstructionValid}>
                                {theme === ThemeType.STEAMPUNK
                                    ? "Release to activate steam conveyance"
                                    : "Drop to upload files"}
                            </span>
                        ) : (
                            <span className={styles.dropInstructionError}>Cannot upload these files</span>
                        )}
                    </p>
                </div>
            ) : (
                <div className={styles.dropzoneContent}>
                    <div className={styles.uploadIconContainer}>
                        <i aria-hidden="true" className={`${getThemeIcon()} ${styles.uploadIcon}`}></i>
                        {theme === ThemeType.ANIME && (
                            <div className={styles.sparkles}>
                                <div className={styles.sparkle}></div>
                                <div className={styles.sparkle}></div>
                                <div className={styles.sparkle}></div>
                            </div>
                        )}
                        {theme === ThemeType.STEAMPUNK && (
                            <div className={styles.steamPuffs}>
                                <div className={styles.steamPuff}></div>
                                <div className={styles.steamPuff}></div>
                                <div className={styles.steamPuff}></div>
                            </div>
                        )}
                    </div>

                    <div className={styles.dropzoneText}>
                        <p className={styles.mainMessage}>{getThemeMessage()}</p>
                        <span className={styles.hint}>
                            Multiple files supported • Max {formatFileSize(maxFileSize)} per file
                        </span>
                        {bucketType === "PREMIUM" && (
                            <span className={styles.permanentHint}>
                                <strong>
                                    {theme === ThemeType.STEAMPUNK
                                        ? "Copper-grade storage - files preserved indefinitely"
                                        : "Permanent storage - files never expire"}
                                </strong>
                            </span>
                        )}
                    </div>

                    {theme === ThemeType.CYBERPUNK && (
                        <div className={styles.cyberpunkGrid}>
                            {Array.from({ length: 8 }, (_, i) => (
                                <div
                                    key={`h-${i}`}
                                    className={styles.gridLineHorizontal}
                                    style={{
                                        top: `${(i + 1) * 12.5}%`,
                                        animationDelay: `${i * 0.1}s`,
                                    }}
                                ></div>
                            ))}
                            {Array.from({ length: 6 }, (_, i) => (
                                <div
                                    key={`v-${i}`}
                                    className={styles.gridLineVertical}
                                    style={{
                                        left: `${(i + 1) * 16.66}%`,
                                        animationDelay: `${i * 0.15}s`,
                                    }}
                                ></div>
                            ))}
                        </div>
                    )}

                    {theme === ThemeType.STEAMPUNK && (
                        <div className={styles.steampunkDecorations}>
                            <div className={styles.steamPipes}>
                                <div className={styles.steamPipeHorizontal}></div>
                                <div className={styles.steamPipeVertical}></div>
                            </div>
                            <div className={styles.pressureGauges}>
                                <div className={styles.pressureGauge}>
                                    <div className={styles.gaugeNeedle}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isTerminal(theme) && (
                        <div className={styles.terminalPrompt}>
                            <span className={styles.prompt}>user@waifuvault:~$</span>
                            <span className={styles.cursor}></span>
                        </div>
                    )}
                </div>
            )}

            {theme === ThemeType.ANIME && !isDragging && (
                <div className={styles.floatingParticles}>
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className={styles.floatingParticle}></div>
                    ))}
                </div>
            )}
        </div>
    );
}
