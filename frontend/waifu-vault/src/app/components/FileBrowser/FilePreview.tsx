"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import styles from "./FilePreview.module.scss";
import type { AdminFileData, UrlFileMixin } from "@/types/AdminTypes";

const thumbnailCache = new Map<string, string>();

interface FilePreviewProps {
    file: AdminFileData | UrlFileMixin | File;
    size?: "small" | "medium" | "large";
}

type FilePreviewType = "audio" | "image" | "pdf" | "text" | "unknown" | "video" | "archive" | "document";

export function FilePreview({ file, size = "medium" }: FilePreviewProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [cachedImageUrl, setCachedImageUrl] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const { getThemeClass } = useTheme();

    const getFileType = useCallback((mediaType: string | null, fileName: string): FilePreviewType => {
        if (!mediaType) {
            return "unknown";
        }

        const mimeType = mediaType.toLowerCase();

        if (mimeType.startsWith("image/")) {
            return "image";
        }
        if (mimeType.startsWith("video/")) {
            return "video";
        }
        if (mimeType.startsWith("audio/")) {
            return "audio";
        }
        if (mimeType.startsWith("text/")) {
            return "text";
        }

        switch (mimeType) {
            case "application/pdf":
                return "pdf";
            case "application/json":
            case "application/javascript":
            case "application/xml":
            case "text/csv":
            case "application/x-yaml":
            case "text/yaml":
            case "text/x-yaml":
                return "text";
            case "application/zip":
            case "application/x-zip-compressed":
            case "application/x-rar-compressed":
            case "application/x-7z-compressed":
            case "application/x-tar":
            case "application/gzip":
                return "archive";
            case "application/vnd.ms-excel":
            case "application/vnd.ms-powerpoint":
                return "document";
            default:
                break;
        }

        if (mimeType.includes("zip") || mimeType.includes("archive")) {
            return "archive";
        }
        if (mimeType.includes("word") || mimeType.includes("sheet") || mimeType.includes("presentation")) {
            return "document";
        }

        if (
            /\.(txt|md|js|ts|jsx|tsx|css|html|xml|yml|yaml|json|csv|log|conf|config|ini|toml|properties)$/i.test(
                fileName,
            )
        ) {
            return "text";
        }

        return "unknown";
    }, []);

    const isClientFile = file instanceof File;
    const fileName = isClientFile
        ? file.name
        : "originalFileName" in file
          ? file.originalFileName
          : (file as UrlFileMixin).parsedFilename;
    const mediaType = isClientFile ? file.type : file.mediaType;
    const fileToken = !isClientFile ? ("token" in file ? file.token : (file as AdminFileData).fileToken) : null;

    const fileType = getFileType(mediaType, fileName);
    const fileUrl =
        fileToken && (fileType === "image" || fileType === "video")
            ? `${process.env.NEXT_PUBLIC_THUMBNAIL_SERVICE}/api/v1/generateThumbnail/${fileToken}?animate=true`
            : null;

    useEffect(() => {
        let mounted = true;

        const loadMetadata = async () => {
            try {
                if (fileType === "image") {
                    if (isClientFile) {
                        const cacheKey = `${(file as File).name}-${(file as File).size}-${(file as File).lastModified}`;
                        if (thumbnailCache.has(cacheKey)) {
                            if (mounted) {
                                setCachedImageUrl(thumbnailCache.get(cacheKey)!);
                                setIsLoading(false);
                            }
                            return;
                        }

                        const reader = new FileReader();
                        reader.onload = e => {
                            if (e.target?.result && mounted) {
                                const blobUrl = e.target.result as string;
                                thumbnailCache.set(cacheKey, blobUrl);
                                setCachedImageUrl(blobUrl);
                                setIsLoading(false);
                            }
                        };
                        reader.onerror = () => {
                            if (mounted) {
                                setPreviewError("Failed to generate image preview");
                                setIsLoading(false);
                            }
                        };
                        reader.readAsDataURL(file as File);
                    } else {
                        const cacheKey = fileToken!;
                        if (thumbnailCache.has(cacheKey)) {
                            if (mounted) {
                                setCachedImageUrl(thumbnailCache.get(cacheKey)!);
                                setIsLoading(false);
                            }
                            return;
                        }

                        const response = await fetch(fileUrl!);
                        if (!response.ok) {
                            throw new Error("Failed to fetch thumbnail");
                        }

                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);

                        thumbnailCache.set(cacheKey, blobUrl);

                        if (mounted) {
                            setCachedImageUrl(blobUrl);
                            setIsLoading(false);
                        }
                    }
                } else if (fileType === "audio") {
                    setIsLoading(false);
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Error loading metadata:", error);
                if (mounted) {
                    setPreviewError("Failed to generate preview");
                    setIsLoading(false);
                }
            }
        };

        loadMetadata();

        return () => {
            mounted = false;
        };
    }, [file, isClientFile, fileUrl, fileType, mediaType, fileName, fileToken]);

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    const sizeClass = `filePreview${size.charAt(0).toUpperCase() + size.slice(1)}`;
    const themeClass = getThemeClass();

    if (isLoading) {
        return (
            <div
                ref={containerRef}
                className={`${styles.filePreview} ${styles[sizeClass]} ${styles.loading} ${styles[themeClass]}`}
            >
                <div className={styles.loadingSpinner}>
                    <div className={styles.spinner}></div>
                </div>
            </div>
        );
    }

    if (previewError) {
        return (
            <div className={`${styles.filePreview} ${styles[sizeClass]} ${styles.error} ${styles[themeClass]}`}>
                <div className={styles.errorContent}>
                    <i className={`bi bi-file-earmark ${styles.fileIcon}`}></i>
                </div>
            </div>
        );
    }

    const renderPreviewContent = () => {
        switch (fileType) {
            case "audio":
                return <AudioWaveform />;

            case "image":
                return (
                    <div className={styles.imageContainer}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            alt={fileName}
                            className={styles.previewImage}
                            src={cachedImageUrl || fileUrl || ""}
                            onError={() => setPreviewError("Failed to load image")}
                        />
                    </div>
                );

            case "video":
                return (
                    <div className={styles.videoContainer}>
                        <div className={styles.videoIcon}>
                            <i className="bi bi-play-circle-fill"></i>
                        </div>
                    </div>
                );

            case "pdf":
                return (
                    <div className={styles.pdfContainer}>
                        <div className={styles.documentStack}>
                            <div className={styles.documentPage}></div>
                            <div className={styles.documentPage}></div>
                            <div className={styles.documentPage}>
                                <i className="bi bi-filetype-pdf"></i>
                            </div>
                        </div>
                    </div>
                );

            case "text":
                return (
                    <div className={styles.textContainer}>
                        <div className={styles.codeEditor}>
                            <div className={styles.editorHeader}>
                                <div className={styles.editorButtons}>
                                    <span className={styles.editorButton}></span>
                                    <span className={styles.editorButton}></span>
                                    <span className={styles.editorButton}></span>
                                </div>
                            </div>
                            <div className={styles.editorContent}>
                                <i className="bi bi-code-slash"></i>
                            </div>
                        </div>
                    </div>
                );

            case "archive":
                return (
                    <div className={styles.archiveContainer}>
                        <i className="bi bi-file-zip"></i>
                    </div>
                );

            case "document":
                return (
                    <div className={styles.documentContainer}>
                        <i className="bi bi-file-earmark-text"></i>
                    </div>
                );

            default:
                return <i className={`bi bi-file-earmark ${styles.fileIcon}`}></i>;
        }
    };

    return (
        <div
            ref={containerRef}
            className={`${styles.filePreview} ${styles[sizeClass]} ${styles[fileType]} ${styles[themeClass]} ${isHovered ? styles.hovered : ""}`}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
        >
            <div className={styles.previewInner}>{renderPreviewContent()}</div>
        </div>
    );
}

function AudioWaveform() {
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const { currentTheme } = useTheme();

    useEffect(() => {
        const generateWaveform = () => {
            const bars = 24;
            const data = Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2);
            setWaveformData(data);
        };

        generateWaveform();
        const interval = setInterval(generateWaveform, 150);

        return () => clearInterval(interval);
    }, []);

    const getWaveformColor = () => {
        switch (currentTheme) {
            case "cyberpunk":
                return "#00ffff";
            case "terminal":
                return "#00ff00";
            case "orangeterminal":
                return "#ffa500";
            case "minimal":
                return "#007bff";
            default:
                return "#667eea";
        }
    };

    return (
        <div className={styles.audioContainer}>
            <div className={styles.audioIcon}>
                <i className="bi bi-music-note-beamed"></i>
            </div>
            <div className={styles.waveform}>
                {waveformData.map((height, index) => (
                    <div
                        key={index}
                        className={styles.waveformBar}
                        style={{
                            height: `${height * 100}%`,
                            backgroundColor: getWaveformColor(),
                            animationDelay: `${index * 0.05}s`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
