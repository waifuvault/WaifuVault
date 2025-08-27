"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import styles from "./FilePreview.module.scss";
import type { UrlFileMixin } from "../../../../../../src/model/dto/AdminBucketDto.js";
import type { AdminFileData } from "../../../../../../src/model/dto/AdminData.js";

interface FilePreviewProps {
    file: AdminFileData | UrlFileMixin;
    size?: "small" | "medium" | "large";
}

type FilePreviewType = "audio" | "image" | "pdf" | "text" | "unknown" | "video" | "archive" | "document";

interface FileMetadata {
    dimensions?: string;
    duration?: string;
}

export function FilePreview({ file, size = "medium" }: FilePreviewProps) {
    const [metadata, setMetadata] = useState<FileMetadata>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const { getThemeClass } = useTheme();

    const getFileType = useCallback((mediaType: string | null, fileName: string): FilePreviewType => {
        if (!mediaType) {
            return "unknown";
        }

        const mimeType = mediaType.toLowerCase();

        // Handle by prefix
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

        // Handle specific mime types
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

        // Handle mime types with keywords
        if (mimeType.includes("zip") || mimeType.includes("archive")) {
            return "archive";
        }
        if (mimeType.includes("word") || mimeType.includes("sheet") || mimeType.includes("presentation")) {
            return "document";
        }

        // Fallback to filename extension for edge cases
        if (
            /\.(txt|md|js|ts|jsx|tsx|css|html|xml|yml|yaml|json|csv|log|conf|config|ini|toml|properties)$/i.test(
                fileName,
            )
        ) {
            return "text";
        }

        return "unknown";
    }, []);

    // Extract file properties based on the file type (AdminFileData vs UrlFileMixin)
    const fileName = "originalFileName" in file ? file.originalFileName : (file as UrlFileMixin).parsedFilename;
    const fileUrl = "url" in file ? (file as UrlFileMixin).url : "";
    const mediaType = file.mediaType;

    const fileType = getFileType(mediaType, fileName);

    useEffect(() => {
        let mounted = true;

        const loadMetadata = async () => {
            try {
                if (fileType === "image") {
                    const img = document.createElement("img");
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                        if (mounted) {
                            setMetadata({ dimensions: `${img.width}×${img.height}` });
                            setIsLoading(false);
                        }
                    };
                    img.onerror = () => {
                        if (mounted) {
                            setPreviewError("Failed to load image");
                            setIsLoading(false);
                        }
                    };
                    img.src = fileUrl;
                } else if (fileType === "video") {
                    const video = document.createElement("video");
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");

                    video.crossOrigin = "anonymous";
                    video.preload = "metadata";
                    video.muted = true;

                    const handleMetadata = () => {
                        if (mounted && !isNaN(video.duration)) {
                            setMetadata({
                                dimensions: `${video.videoWidth}×${video.videoHeight}`,
                                duration: formatDuration(video.duration),
                            });

                            // Seek to 10% of video duration to get a thumbnail
                            video.currentTime = video.duration * 0.1;
                        }
                    };

                    const handleSeeked = () => {
                        if (mounted && ctx) {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;

                            try {
                                ctx.drawImage(video, 0, 0);
                                const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
                                setVideoThumbnail(thumbnailUrl);
                            } catch (error) {
                                console.warn("Failed to generate video thumbnail:", error);
                            }
                        }
                        setIsLoading(false);
                        video.remove();
                    };

                    const handleError = () => {
                        if (mounted) {
                            setPreviewError("Failed to load video");
                            setIsLoading(false);
                        }
                        video.remove();
                    };

                    video.addEventListener("loadedmetadata", handleMetadata);
                    video.addEventListener("seeked", handleSeeked);
                    video.addEventListener("error", handleError);
                    video.src = fileUrl;
                } else if (fileType === "audio") {
                    const audio = new Audio();
                    audio.crossOrigin = "anonymous";
                    audio.onloadedmetadata = () => {
                        if (mounted) {
                            setMetadata({ duration: formatDuration(audio.duration) });
                        }
                        setIsLoading(false);
                    };
                    audio.onerror = () => {
                        if (mounted) {
                            setPreviewError("Failed to load audio");
                        }
                        setIsLoading(false);
                    };
                    audio.src = fileUrl;
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
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
    }, [fileUrl, fileType, mediaType, fileName]);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

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
            <div className={`${styles.filePreview} ${styles[sizeClass]} ${styles.loading} ${styles[themeClass]}`}>
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
                        <img
                            alt={fileName}
                            className={styles.previewImage}
                            src={fileUrl}
                            onError={() => setPreviewError("Failed to load image")}
                        />
                        {metadata.dimensions && (
                            <div className={styles.imageOverlay}>
                                <span className={styles.metadataTag}>{metadata.dimensions}</span>
                            </div>
                        )}
                    </div>
                );

            case "video":
                return (
                    <div className={styles.videoContainer}>
                        {videoThumbnail ? (
                            <img alt={`${fileName} thumbnail`} className={styles.previewImage} src={videoThumbnail} />
                        ) : (
                            <div className={styles.videoPlaceholder}>
                                <i className="bi bi-play-circle-fill"></i>
                            </div>
                        )}
                        <div className={styles.playOverlay}>
                            <i className="bi bi-play-circle-fill"></i>
                        </div>
                        {metadata.duration && <div className={styles.durationBadge}>{metadata.duration}</div>}
                        {metadata.dimensions && (
                            <div className={styles.videoOverlay}>
                                <span className={styles.metadataTag}>{metadata.dimensions}</span>
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

// Audio waveform component
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
