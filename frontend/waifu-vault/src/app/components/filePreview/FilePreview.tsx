"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/contexts";
import { useErrorHandler } from "@/app/hooks";
import styles from "./FilePreview.module.scss";
import { FileWrapper, type WrappableFile } from "@/app/types";

const thumbnailCache = new Map<string, string>();

interface FilePreviewProps {
    file: WrappableFile | FileWrapper;
    size?: "small" | "medium" | "large";
    lazy?: boolean;
    priority?: boolean;
    publicToken?: string;
}

type FilePreviewType = "audio" | "image" | "pdf" | "text" | "unknown" | "video" | "archive" | "document";

export function FilePreview({ file, size = "medium", lazy = false, priority = false, publicToken }: FilePreviewProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [cachedImageUrl, setCachedImageUrl] = useState<string | null>(null);
    const [isIntersecting, setIsIntersecting] = useState(!lazy);

    const containerRef = useRef<HTMLDivElement>(null);
    const { getThemeClass } = useTheme();
    const { handleError } = useErrorHandler();

    const wrappedFile = file instanceof FileWrapper ? file : new FileWrapper(file);

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

    const isClientFile = wrappedFile.isClientFile;
    const fileName = wrappedFile.fileName;
    const mediaType = wrappedFile.mediaType;
    const fileToken = wrappedFile.fileToken;

    const fileType = getFileType(mediaType, fileName);
    const fileUrl = wrappedFile.getFileUrl(fileType, publicToken);

    useEffect(() => {
        if (lazy && containerRef.current) {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setIsIntersecting(true);
                        observer.disconnect();
                    }
                },
                { threshold: 0.1, rootMargin: "50px" },
            );

            observer.observe(containerRef.current);

            return () => observer.disconnect();
        }
    }, [lazy]);

    useEffect(() => {
        if (!isIntersecting && lazy) {
            return;
        }

        let mounted = true;

        const loadMetadata = async () => {
            try {
                // Skip thumbnail generation for password-protected files
                if (wrappedFile.isProtected) {
                    setIsLoading(false);
                    return;
                }

                if (fileType === "image" && isClientFile) {
                    const clientFile = wrappedFile.raw as File;
                    const cacheKey = `${clientFile.name}-${clientFile.size}-${clientFile.lastModified}`;
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
                            setPreviewError("Failed to generate preview");
                            setIsLoading(false);
                        }
                    };
                    reader.readAsDataURL(clientFile);
                } else if ((fileType === "image" || fileType === "video") && !isClientFile) {
                    if (!fileUrl) {
                        if (mounted) {
                            setIsLoading(false);
                        }
                        return;
                    }

                    const cacheKey = fileToken || `${wrappedFile.id}-${publicToken}`;
                    if (thumbnailCache.has(cacheKey)) {
                        if (mounted) {
                            setCachedImageUrl(thumbnailCache.get(cacheKey)!);
                            setIsLoading(false);
                        }
                        return;
                    }

                    const response = await fetch(fileUrl);
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
                } else if (fileType === "audio") {
                    setIsLoading(false);
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to load file preview" });
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wrappedFile, isClientFile, fileUrl, fileType, mediaType, fileName, fileToken, isIntersecting, lazy]);

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
        if (wrappedFile.isProtected) {
            return (
                <div className={styles.protectedContainer}>
                    <i className={`bi bi-lock-fill ${styles.protectedIcon}`}></i>
                </div>
            );
        }

        switch (fileType) {
            case "audio":
                return <AudioWaveform />;

            case "image":
                const imageSrc = cachedImageUrl || fileUrl;
                return (
                    <div className={styles.imageContainer}>
                        {imageSrc ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                alt={fileName}
                                className={styles.previewImage}
                                src={imageSrc}
                                loading={lazy && !priority ? "lazy" : "eager"}
                                onError={() => setPreviewError("Failed to load image")}
                            />
                        ) : (
                            <div className={styles.imagePlaceholder}>
                                <i className="bi bi-image"></i>
                            </div>
                        )}
                    </div>
                );

            case "video":
                const videoSrc = cachedImageUrl || fileUrl;
                return (
                    <div className={styles.videoContainer}>
                        {videoSrc ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    alt={fileName}
                                    className={styles.previewImage}
                                    src={videoSrc}
                                    loading={lazy && !priority ? "lazy" : "eager"}
                                    onError={() => setPreviewError("Failed to load video thumbnail")}
                                />
                                <div className={styles.videoIcon}>
                                    <i className="bi bi-play-circle-fill"></i>
                                </div>
                            </>
                        ) : (
                            <div className={styles.videoIcon}>
                                <i className="bi bi-play-circle-fill"></i>
                            </div>
                        )}
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
