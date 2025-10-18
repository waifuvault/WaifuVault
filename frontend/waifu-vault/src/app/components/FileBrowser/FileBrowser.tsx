"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Button,
    ContextMenu,
    type ContextMenuItem,
    FilePreview,
    FileUploadModal,
    Input,
    Pill,
    Tooltip,
} from "@/app/components";
import { useContextMenu, useErrorHandler } from "@/app/hooks";
import styles from "./FileBrowser.module.scss";
import { type BucketType, FileWrapper, type UploadFile } from "@/app/types";
import {
    getPaginationKey,
    getPaginationSizeKey,
    getSortFieldKey,
    getSortOrderKey,
    getViewModeKey,
    LocalStorage,
} from "@/constants/localStorageKeys";
import { useToast } from "@/app/components/Toast";
import { ConfirmDialog } from "@/app/components/ConfirmDialog/ConfirmDialog";

type SortField = "name" | "date" | "size" | "type" | "layout";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "list" | "detailed";

interface FileBrowserProps {
    files: FileWrapper[];
    albums?: { token: string; name: string }[];
    onFilesSelected?: (fileIds: number[]) => void;
    onDeleteFiles?: (fileIds: number[]) => Promise<void>;
    onDeleteBucket?: () => void;
    onReorderFiles?: (
        fileId: number,
        oldPosition: number,
        newPosition: number,
        showSuccessToast?: boolean,
    ) => Promise<void>;
    onRemoveFromAlbum?: (fileIds: number[]) => Promise<void>;
    onDragStart?: (isDraggingToAlbum: boolean) => void;
    onDragEnd?: () => void;
    onLogout?: () => void;
    onUploadComplete?: (files?: UploadFile[]) => Promise<void>;
    onBanIp?: (ip: string) => void;
    onBanSelectedIps?: () => void;
    onShowDetails?: (file: FileWrapper) => void;
    showSearch?: boolean;
    showSort?: boolean;
    showViewToggle?: boolean;
    allowSelection?: boolean;
    allowDeletion?: boolean;
    allowReorder?: boolean;
    allowRemoveFromAlbum?: boolean;
    allowUpload?: boolean;
    albumToken?: string;
    publicToken?: string;
    bucketToken?: string;
    bucketType?: BucketType;
    mode: "bucket" | "admin" | "public";
    itemsPerPage?: number;
    showPagination?: boolean;
}

export function FileBrowser({
    files,
    albums,
    onFilesSelected,
    onDeleteFiles,
    onDeleteBucket,
    onReorderFiles,
    onRemoveFromAlbum,
    onDragStart,
    onDragEnd,
    onLogout,
    onUploadComplete,
    onBanIp,
    onBanSelectedIps,
    onShowDetails,
    showSearch = true,
    showSort = true,
    showViewToggle = true,
    allowSelection = true,
    allowDeletion = true,
    allowReorder = false,
    allowRemoveFromAlbum = false,
    allowUpload = false,
    albumToken,
    publicToken,
    bucketToken,
    bucketType,
    mode,
    itemsPerPage = 10,
    showPagination = true,
}: FileBrowserProps) {
    const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
    const [lastSelectedFile, setLastSelectedFile] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
    const { handleError } = useErrorHandler();
    const [draggedFiles, setDraggedFiles] = useState<number[]>([]);
    const [draggedOverFile, setDraggedOverFile] = useState<number | null>(null);
    const [isDraggingToAlbum, setIsDraggingToAlbum] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentItemsPerPage, setCurrentItemsPerPage] = useState(itemsPerPage);
    const [uploadModal, setUploadModal] = useState<{
        isOpen: boolean;
        albumToken?: string;
        albumName?: string;
    }>({
        isOpen: false,
    });
    const [deleteFilesDialog, setDeleteFilesDialog] = useState<{
        isOpen: boolean;
    }>({
        isOpen: false,
    });
    const { showToast } = useToast();

    const fileListRef = useRef<HTMLDivElement>(null);

    const isSearchActive = useMemo(() => searchQuery.trim() !== "", [searchQuery]);

    const filteredFiles = useMemo(() => {
        return files.filter(file => {
            const searchLower = searchQuery.toLowerCase();
            return file.fileName.toLowerCase().includes(searchLower);
        });
    }, [files, searchQuery]);

    const sortedFiles = useMemo(() => {
        return [...filteredFiles].sort((a, b) => {
            if (albumToken && a.addedToAlbumOrder !== null && b.addedToAlbumOrder !== null && sortField === "layout") {
                const orderA = a.addedToAlbumOrder ?? Infinity;
                const orderB = b.addedToAlbumOrder ?? Infinity;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
            }

            let comparison: number;

            switch (sortField) {
                case "date":
                    const dateA = a.createdAt;
                    const dateB = b.createdAt;
                    const timeA = dateA instanceof Date ? dateA.getTime() : new Date(dateA).getTime();
                    const timeB = dateB instanceof Date ? dateB.getTime() : new Date(dateB).getTime();
                    comparison = timeA - timeB;
                    break;
                case "size":
                    comparison = a.fileSize - b.fileSize;
                    break;
                case "type":
                    const aFileExtension = a.fileExtension.toLowerCase();
                    const bFileExtension = b.fileExtension.toLowerCase();
                    comparison = aFileExtension.localeCompare(bFileExtension);
                    break;
                case "name":
                default:
                    comparison = a.fileName.localeCompare(b.fileName);
                    break;
            }

            return sortOrder === "asc" ? comparison : -comparison;
        });
    }, [filteredFiles, sortField, sortOrder, albumToken]);

    const handleSelectAll = useCallback(() => {
        const allFileIds = new Set(sortedFiles.map(f => f.id));
        setSelectedFiles(allFileIds);
        onFilesSelected?.(Array.from(allFileIds));
    }, [sortedFiles, onFilesSelected]);

    const totalPages = showPagination ? Math.ceil(sortedFiles.length / currentItemsPerPage) : 1;
    const startIndex = showPagination ? (currentPage - 1) * currentItemsPerPage : 0;
    const endIndex = showPagination ? startIndex + currentItemsPerPage : sortedFiles.length;
    const previewFiles = showPagination ? sortedFiles.slice(startIndex, endIndex) : sortedFiles;

    useEffect(() => {
        const pageSizeKey = getPaginationSizeKey(albumToken);
        const savedSize = LocalStorage.getNumberDynamic(pageSizeKey, itemsPerPage);
        setCurrentItemsPerPage(savedSize);

        const pageKey = getPaginationKey(albumToken);
        const savedPage = LocalStorage.getNumberDynamic(pageKey, 1);
        setCurrentPage(savedPage);

        const actualTotalPages = showPagination ? Math.ceil(sortedFiles.length / savedSize) : 1;

        if (savedPage > actualTotalPages && actualTotalPages > 0) {
            setCurrentPage(1);
            LocalStorage.setNumberDynamic(pageKey, 1);
        }
    }, [currentPage, albumToken, itemsPerPage, showPagination, sortedFiles]);

    useEffect(() => {
        const viewModeKey = getViewModeKey(albumToken);
        const savedViewMode = LocalStorage.getStringDynamic(viewModeKey, "grid");
        if (savedViewMode === "grid" || savedViewMode === "list" || savedViewMode === "detailed") {
            setViewMode(savedViewMode);
        }
    }, [albumToken]);

    useEffect(() => {
        const sortFieldKey = getSortFieldKey(albumToken);
        const sortOrderKey = getSortOrderKey(albumToken);

        const savedSortField = LocalStorage.getStringDynamic(sortFieldKey, "name");
        const savedSortOrder = LocalStorage.getStringDynamic(sortOrderKey, "asc");

        if (
            savedSortField === "name" ||
            savedSortField === "date" ||
            savedSortField === "size" ||
            savedSortField === "type" ||
            savedSortField === "layout"
        ) {
            setSortField(savedSortField);
        }

        if (savedSortOrder === "asc" || savedSortOrder === "desc") {
            setSortOrder(savedSortOrder);
        }
    }, [albumToken]);

    const handlePageChange = useCallback(
        (page: number) => {
            setCurrentPage(page);
            const pageKey = getPaginationKey(albumToken);
            LocalStorage.setNumberDynamic(pageKey, page);
            fileListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
        [albumToken],
    );

    const handlePageSizeChange = useCallback(
        (size: number) => {
            setCurrentItemsPerPage(size);
            const pageKey = getPaginationSizeKey(albumToken);
            LocalStorage.setNumberDynamic(pageKey, size);
        },
        [albumToken],
    );

    const handleViewModeChange = useCallback(
        (mode: ViewMode) => {
            setViewMode(mode);
            const viewModeKey = getViewModeKey(albumToken);
            LocalStorage.setStringDynamic(viewModeKey, mode);
        },
        [albumToken],
    );

    const handleSortFieldChange = useCallback(
        (field: SortField) => {
            setSortField(field);
            const sortFieldKey = getSortFieldKey(albumToken);
            LocalStorage.setStringDynamic(sortFieldKey, field);
        },
        [albumToken],
    );

    const handleSortOrderChange = useCallback(
        (order: SortOrder) => {
            setSortOrder(order);
            const sortOrderKey = getSortOrderKey(albumToken);
            LocalStorage.setStringDynamic(sortOrderKey, order);
        },
        [albumToken],
    );

    const handleUploadClick = useCallback(
        (targetAlbumToken?: string) => {
            const album = targetAlbumToken ? albums?.find(a => a.token === targetAlbumToken) : null;
            setUploadModal({
                isOpen: true,
                albumToken: targetAlbumToken,
                albumName: album?.name,
            });
        },
        [albums],
    );

    const handleUploadClose = useCallback(() => {
        setUploadModal({ isOpen: false });
    }, []);

    const handleUploadCompleteInternal = useCallback(
        async (files?: UploadFile[]) => {
            if (onUploadComplete) {
                await onUploadComplete(files);
            }
        },
        [onUploadComplete],
    );

    const handleDeleteFilesClick = useCallback(() => {
        setDeleteFilesDialog({
            isOpen: true,
        });
    }, []);

    const handleDeleteFilesCancel = useCallback(() => {
        setDeleteFilesDialog({ isOpen: false });
    }, []);

    const handleDeleteFilesConfirm = useCallback(
        async () => {
            if (!allowDeletion || selectedFiles.size === 0 || !onDeleteFiles) {
                return;
            }

            try {
                await onDeleteFiles(Array.from(selectedFiles));
                setSelectedFiles(new Set());
                setDeleteFilesDialog({ isOpen: false });
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to delete bucket" });
            }
        },
        [allowDeletion, selectedFiles, onDeleteFiles], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const isInitialMount = useRef(true);
    const previousFilesLength = useRef(files.length);
    const previousSearchQuery = useRef(searchQuery);
    const previousAlbumToken = useRef(albumToken);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            previousFilesLength.current = files.length;
            previousSearchQuery.current = searchQuery;
            previousAlbumToken.current = albumToken;
            return;
        }

        const albumChanged = previousAlbumToken.current !== albumToken;
        const filesChanged = previousFilesLength.current !== files.length;
        const searchChanged = previousSearchQuery.current !== searchQuery;

        if ((filesChanged || searchChanged) && !albumChanged) {
            setCurrentPage(1);
            const pageKey = getPaginationKey(albumToken);
            LocalStorage.setNumberDynamic(pageKey, 1);
        }

        previousFilesLength.current = files.length;
        previousSearchQuery.current = searchQuery;
        previousAlbumToken.current = albumToken;
    }, [files.length, searchQuery, albumToken]);

    const handleClearSelection = useCallback(() => {
        setSelectedFiles(new Set());
        onFilesSelected?.([]);
    }, [onFilesSelected]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case "a":
                        event.preventDefault();
                        handleSelectAll();
                        break;
                }
            } else if (event.key === "Delete" && selectedFiles.size > 0 && allowDeletion) {
                event.preventDefault();
                handleDeleteFilesClick();
            } else if (event.key === "Escape") {
                setSelectedFiles(new Set());
                hideContextMenu();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedFiles, allowDeletion, handleSelectAll, handleDeleteFilesClick, hideContextMenu]);

    const handleFileSelect = useCallback(
        (fileId: number, event?: React.MouseEvent) => {
            if (!allowSelection) {
                return;
            }

            const newSelected = new Set(selectedFiles);

            if (event?.shiftKey && lastSelectedFile !== null) {
                const fileIds = sortedFiles.map(f => f.id);
                const startIndex = fileIds.indexOf(lastSelectedFile);
                const endIndex = fileIds.indexOf(fileId);
                const [start, end] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];

                for (let i = start; i <= end; i++) {
                    newSelected.add(fileIds[i]);
                }
            } else {
                if (newSelected.has(fileId)) {
                    newSelected.delete(fileId);
                } else {
                    newSelected.add(fileId);
                }
            }

            setSelectedFiles(newSelected);
            setLastSelectedFile(fileId);
            onFilesSelected?.(Array.from(newSelected));
        },
        [selectedFiles, lastSelectedFile, sortedFiles, allowSelection, onFilesSelected],
    );

    const handleContextMenu = useCallback(
        (event: React.MouseEvent, fileId?: number) => {
            event.preventDefault();
            event.stopPropagation();

            const file = fileId ? sortedFiles.find(f => f.id === fileId) : null;

            const contextMenuItems: ContextMenuItem[] = [];

            if (file) {
                contextMenuItems.push({
                    id: "open",
                    label: "Open",
                    icon: <i className="bi bi-box-arrow-up-right"></i>,
                    onClick: () => window.open(file.url, "_blank"),
                });

                contextMenuItems.push({
                    id: "urlCopy",
                    label: "Copy URL",
                    icon: <i className="bi bi bi-link"></i>,
                    onClick: async () => {
                        try {
                            await navigator.clipboard.writeText(file.url);
                        } catch (e) {
                            handleError(e, {
                                defaultMessage: "Failed to copy URL",
                                rethrow: false,
                            });
                            return;
                        }
                        showToast("success", "URL copied successfully");
                    },
                });

                if (mode === "admin" && onShowDetails) {
                    contextMenuItems.push({
                        id: "showDetails",
                        label: "Show Details",
                        icon: <i className="bi bi-info-circle"></i>,
                        onClick: () => onShowDetails(file),
                    });
                }

                if (mode === "admin" && onBanIp && file.ip) {
                    contextMenuItems.push({
                        id: "banIp",
                        label: "Ban IP",
                        icon: <i className="bi bi-shield-x"></i>,
                        onClick: () => onBanIp(file.ip!),
                        variant: "danger" as const,
                    });
                }

                if (allowRemoveFromAlbum) {
                    contextMenuItems.push({
                        id: "removeFromAlbum",
                        label: "Remove from Album",
                        icon: <i className="bi bi-dash-square"></i>,
                        onClick: () => {
                            const filesToRemove = selectedFiles.has(file.id) ? Array.from(selectedFiles) : [file.id];

                            if (
                                confirm(
                                    `Are you sure you want to remove ${filesToRemove.length} file(s) from this album?`,
                                )
                            ) {
                                onRemoveFromAlbum?.(filesToRemove);
                                setSelectedFiles(new Set());
                            }
                        },
                    });
                }

                if (allowDeletion) {
                    contextMenuItems.push({
                        id: "delete",
                        label: "Delete",
                        icon: <i className="bi bi-trash"></i>,
                        onClick: handleDeleteFilesClick,
                        variant: "danger" as const,
                        separator: true,
                    });
                }
            } else {
                contextMenuItems.push({
                    id: "selectAll",
                    label: "Select All",
                    icon: <i className="bi bi-check-all"></i>,
                    onClick: handleSelectAll,
                });

                if (selectedFiles.size > 0) {
                    contextMenuItems.push({
                        id: "clearSelection",
                        label: "Clear Selection",
                        icon: <i className="bi bi-x-circle"></i>,
                        onClick: handleClearSelection,
                    });
                }
            }

            showContextMenu(event.nativeEvent, contextMenuItems);
        },
        [
            sortedFiles,
            allowDeletion,
            allowRemoveFromAlbum,
            selectedFiles,
            handleDeleteFilesClick,
            handleSelectAll,
            handleClearSelection,
            showContextMenu,
            onRemoveFromAlbum,
            mode,
            onBanIp,
            onShowDetails,
        ],
    );

    const handleDragStart = useCallback(
        (event: React.DragEvent, fileId: number) => {
            const selectedFileIds = selectedFiles.has(fileId) ? Array.from(selectedFiles) : [fileId];
            const draggedFileTokens = selectedFileIds
                .map(id => {
                    const file = sortedFiles.find(f => f.id === id);
                    return file && file.fileToken ? file.fileToken : "";
                })
                .filter(Boolean);

            setDraggedFiles(selectedFileIds);
            event.dataTransfer.setData("application/json", JSON.stringify(draggedFileTokens));
            event.dataTransfer.setData("text/plain", selectedFileIds.join(","));
            event.dataTransfer.effectAllowed = "move";

            const dragImage = document.createElement("div");
            dragImage.style.width = "100px";
            dragImage.style.height = "60px";
            dragImage.style.backgroundColor = "rgba(99, 102, 241, 0.8)";
            dragImage.style.borderRadius = "8px";
            dragImage.style.display = "flex";
            dragImage.style.alignItems = "center";
            dragImage.style.justifyContent = "center";
            dragImage.style.color = "white";
            dragImage.style.fontSize = "14px";
            dragImage.style.fontWeight = "600";
            dragImage.style.position = "absolute";
            dragImage.style.top = "-1000px";
            dragImage.textContent = `${selectedFileIds.length} file${selectedFileIds.length > 1 ? "s" : ""}`;
            document.body.appendChild(dragImage);
            event.dataTransfer.setDragImage(dragImage, 50, 30);

            setTimeout(() => document.body.removeChild(dragImage), 0);

            const isDraggingToAlbum = !allowReorder || !albumToken || isSearchActive || sortField !== "layout";
            if (isDraggingToAlbum) {
                setIsDraggingToAlbum(true);
                onDragStart?.(true);
            } else {
                onDragStart?.(false);
            }
        },
        [selectedFiles, allowReorder, albumToken, sortedFiles, onDragStart, isSearchActive, sortField],
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent, targetFileId: number) => {
            if (!allowReorder || isDraggingToAlbum || isSearchActive) {
                return;
            }

            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            setDraggedOverFile(targetFileId);
        },
        [allowReorder, isDraggingToAlbum, isSearchActive],
    );

    const handleDragLeave = useCallback(
        (e: React.DragEvent) => {
            if (!allowReorder || isDraggingToAlbum || isSearchActive) {
                return;
            }

            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDraggedOverFile(null);
            }
        },
        [allowReorder, isDraggingToAlbum, isSearchActive],
    );

    const handleDrop = useCallback(
        async (e: React.DragEvent, targetFileId: number) => {
            if (!allowReorder || !onReorderFiles || isDraggingToAlbum || sortField !== "layout" || isSearchActive) {
                return;
            }

            e.preventDefault();

            const draggedFileIds = draggedFiles;

            if (draggedFileIds.length !== 1) {
                return;
            }
            const targetFile = sortedFiles.find(f => f.id === targetFileId);
            const draggedFile = sortedFiles.find(f => f.id === draggedFileIds[0]);

            if (!targetFile || !draggedFile || draggedFileIds.includes(targetFileId)) {
                return;
            }

            const targetIndex = sortedFiles.findIndex(f => f.id === targetFileId);
            const draggedIndex = sortedFiles.findIndex(f => f.id === draggedFileIds[0]);

            const newPosition = targetIndex;

            if (newPosition === draggedIndex) {
                return;
            }

            try {
                await onReorderFiles(draggedFileIds[0], draggedIndex, newPosition, true);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to reorder files" });
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [allowReorder, onReorderFiles, isDraggingToAlbum, draggedFiles, sortedFiles, isSearchActive],
    );

    const handleDragEnd = useCallback(() => {
        setDraggedFiles([]);
        setDraggedOverFile(null);
        setIsDraggingToAlbum(false);
        onDragEnd?.();
    }, [onDragEnd]);

    const renderFileName = useCallback((file: FileWrapper) => {
        return file.fileName;
    }, []);

    const renderFileCheckbox = useCallback(
        (fileId: number) => {
            return (
                <input
                    type="checkbox"
                    checked={selectedFiles.has(fileId)}
                    onChange={e => {
                        e.stopPropagation();
                        const newSelected = new Set(selectedFiles);
                        if (newSelected.has(fileId)) {
                            newSelected.delete(fileId);
                        } else {
                            newSelected.add(fileId);
                        }
                        setSelectedFiles(newSelected);
                        setLastSelectedFile(fileId);
                        onFilesSelected?.(Array.from(newSelected));
                    }}
                />
            );
        },
        [selectedFiles, onFilesSelected],
    );

    const getFileIcon = useCallback((file: FileWrapper) => {
        const mediaType = file.mediaType?.toLowerCase() || "";

        if (mediaType.startsWith("image/")) {
            return { icon: <i className="bi bi-image"></i>, color: "#4CAF50" };
        }
        if (mediaType.startsWith("video/")) {
            return { icon: <i className="bi bi-camera-video"></i>, color: "#F44336" };
        }
        if (mediaType.startsWith("audio/")) {
            return { icon: <i className="bi bi-music-note"></i>, color: "#9C27B0" };
        }
        if (mediaType === "application/pdf") {
            return { icon: <i className="bi bi-file-earmark-pdf"></i>, color: "#F44336" };
        }
        if (mediaType.includes("zip") || mediaType.includes("archive") || mediaType.includes("compressed")) {
            return { icon: <i className="bi bi-archive"></i>, color: "#FF9800" };
        }
        if (mediaType.startsWith("text/") || mediaType.includes("json") || mediaType.includes("javascript")) {
            return { icon: <i className="bi bi-file-earmark-text"></i>, color: "#2196F3" };
        }
        return { icon: <i className="bi bi-file-earmark"></i>, color: "#757575" };
    }, []);

    const handleSort = useCallback(
        (field: SortField) => {
            if (sortField === field) {
                handleSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
            } else {
                handleSortFieldChange(field);
                handleSortOrderChange("asc");
            }
        },
        [sortField, sortOrder, handleSortFieldChange, handleSortOrderChange],
    );

    const formatFileSize = useCallback((bytes?: number) => {
        if (!bytes) {
            return "-";
        }
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${Math.round(bytes / 1024)} KB`;
        }
        if (bytes < 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }, []);

    const formatDate = useCallback((date: string | Date) => {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }, []);

    const formatExpires = useCallback(
        (expires: Date | string | number | null): string => {
            if (!expires || expires === null || expires === undefined || expires === "" || expires === "null") {
                return "Never";
            }

            if (
                typeof expires === "string" &&
                (expires.includes("days") || expires.includes("hours") || expires.includes("minutes"))
            ) {
                return `In ${expires}`;
            }

            try {
                const dateObj =
                    typeof expires === "string" || typeof expires === "number" ? new Date(expires) : expires;
                if (isNaN(dateObj.getTime())) {
                    return "Invalid Date";
                }
                return formatDate(dateObj);
            } catch {
                return "Invalid Date";
            }
        },
        [formatDate],
    );

    const getAlbumName = useCallback(
        (file: FileWrapper): string | null => {
            return file.getAlbumName(albums);
        },
        [albums],
    );

    if (files.length === 0) {
        return (
            <div className={styles.fileBrowser}>
                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}></div>
                    <div className={styles.toolbarCenter}></div>
                    <div className={styles.toolbarRight}>
                        <div className={styles.fileActions}>
                            {allowUpload && (
                                <Button
                                    variant="primary"
                                    size="small"
                                    onClick={() => handleUploadClick(albumToken)}
                                    className={styles.uploadBtn}
                                >
                                    <i className="bi bi-cloud-upload"></i> Upload Files
                                    {albumToken && " to Album"}
                                </Button>
                            )}
                            {onLogout && (
                                <Button
                                    variant="secondary"
                                    size="small"
                                    onClick={onLogout}
                                    className={styles.logoutBtn}
                                >
                                    Logout
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                <div className={styles.emptyState}>
                    <p>No files available.</p>
                    {allowUpload && (
                        <p>
                            Click the &ldquo;Upload Files&rdquo; button above to add files
                            {albumToken ? " to this album" : ""}.
                        </p>
                    )}
                </div>

                {allowUpload && (
                    <FileUploadModal
                        isOpen={uploadModal.isOpen}
                        onClose={handleUploadClose}
                        bucketToken={bucketToken}
                        albumToken={uploadModal.albumToken}
                        albumName={uploadModal.albumName}
                        currentAlbumFileCount={uploadModal.albumToken ? filteredFiles.length : 0}
                        bucketType={bucketType}
                        onUploadComplete={handleUploadCompleteInternal}
                    />
                )}
            </div>
        );
    }

    return (
        <div className={styles.fileBrowser}>
            {/* Drag overlay for screen dimming */}
            {isDraggingToAlbum && (
                <div className={`${styles.dragOverlay} ${isDraggingToAlbum ? styles.visible : ""}`} />
            )}

            {/* Enhanced Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    {showViewToggle && (
                        <div className={styles.viewControls}>
                            <Button
                                variant={viewMode === "grid" ? "primary" : "outline"}
                                size="small"
                                onClick={() => handleViewModeChange("grid")}
                            >
                                <i className="bi bi-grid-3x3"></i> Grid
                            </Button>
                            <Button
                                variant={viewMode === "list" ? "primary" : "outline"}
                                size="small"
                                onClick={() => handleViewModeChange("list")}
                            >
                                <i className="bi bi-list"></i> List
                            </Button>
                            <Button
                                variant={viewMode === "detailed" ? "primary" : "outline"}
                                size="small"
                                onClick={() => handleViewModeChange("detailed")}
                            >
                                <i className="bi bi-table"></i> Table
                            </Button>
                        </div>
                    )}
                    {selectedFiles.size > 0 && (
                        <div className={styles.selectionInfo}>
                            <span className={styles.selectionCount}>
                                {selectedFiles.size} of {sortedFiles.length} selected
                            </span>
                        </div>
                    )}
                </div>

                <div className={styles.toolbarCenter}>
                    {showSearch && (
                        <div className={styles.searchBox}>
                            <Input
                                type="text"
                                placeholder="Search files and types..."
                                className={styles.searchInput}
                                variant="search"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.toolbarRight}>
                    <div className={styles.fileActions}>
                        {allowUpload && (
                            <Button
                                variant="primary"
                                size="small"
                                onClick={() => handleUploadClick(albumToken)}
                                className={styles.uploadBtn}
                            >
                                <i className="bi bi-cloud-upload"></i> Upload Files
                                {albumToken && " to Album"}
                            </Button>
                        )}

                        {selectedFiles.size > 0 && (
                            <>
                                {mode === "admin" && onBanSelectedIps && (
                                    <Button
                                        variant="outline"
                                        size="small"
                                        onClick={onBanSelectedIps}
                                        className={styles.banIpBtn}
                                    >
                                        <i className="bi bi-shield-x"></i> Ban IPs ({selectedFiles.size})
                                    </Button>
                                )}
                                {allowDeletion && (
                                    <Button
                                        variant="outline"
                                        size="small"
                                        onClick={handleDeleteFilesClick}
                                        className={styles.deleteBtn}
                                    >
                                        <i className="bi bi-trash"></i> Delete ({selectedFiles.size})
                                    </Button>
                                )}
                            </>
                        )}

                        <Button variant="outline" size="small" onClick={handleSelectAll}>
                            Select All
                        </Button>

                        {selectedFiles.size > 0 && (
                            <Button variant="outline" size="small" onClick={handleClearSelection}>
                                Clear
                            </Button>
                        )}
                    </div>

                    {mode === "bucket" && (
                        <Button variant="outline" size="small" onClick={onDeleteBucket} className={styles.deleteBtn}>
                            <i className="bi bi-radioactive"></i> Delete Bucket
                        </Button>
                    )}

                    {onLogout && (
                        <Button variant="secondary" size="small" onClick={onLogout} className={styles.logoutBtn}>
                            Logout
                        </Button>
                    )}
                </div>
            </div>

            {/* Sort Header */}
            {showSort && (
                <div className={styles.sortHeader}>
                    <div className={styles.sortControls}>
                        {albumToken && (
                            <Button
                                variant={sortField === "layout" ? "primary" : "outline"}
                                size="small"
                                onClick={() => handleSort("layout")}
                            >
                                Layout
                            </Button>
                        )}
                        <Button
                            variant={sortField === "name" ? "primary" : "outline"}
                            size="small"
                            onClick={() => handleSort("name")}
                        >
                            Name {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                        </Button>
                        <Button
                            variant={sortField === "date" ? "primary" : "outline"}
                            size="small"
                            onClick={() => handleSort("date")}
                        >
                            Date {sortField === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                        </Button>
                        <Button
                            variant={sortField === "size" ? "primary" : "outline"}
                            size="small"
                            onClick={() => handleSort("size")}
                        >
                            Size {sortField === "size" && (sortOrder === "asc" ? "↑" : "↓")}
                        </Button>
                        <Button
                            variant={sortField === "type" ? "primary" : "outline"}
                            size="small"
                            onClick={() => handleSort("type")}
                        >
                            Type {sortField === "type" && (sortOrder === "asc" ? "↑" : "↓")}
                        </Button>
                        <Button
                            variant={currentItemsPerPage === itemsPerPage ? "primary" : "outline"}
                            size="small"
                            onClick={() => handlePageSizeChange(itemsPerPage)}
                            className={styles.pageSize}
                        >
                            {itemsPerPage}
                        </Button>
                        <Button
                            variant={currentItemsPerPage === itemsPerPage * 5 ? "primary" : "outline"}
                            size="small"
                            onClick={() => handlePageSizeChange(itemsPerPage * 5)}
                        >
                            {itemsPerPage * 5}
                        </Button>
                        <Button
                            variant={currentItemsPerPage === itemsPerPage * 10 ? "primary" : "outline"}
                            size="small"
                            onClick={() => handlePageSizeChange(itemsPerPage * 10)}
                        >
                            {itemsPerPage * 10}
                        </Button>
                    </div>
                    {albumToken && sortField === "layout" && (
                        <div className={styles.albumOrderInfo}>
                            <i className="bi bi-info-circle"></i>
                            <div className={styles.infoContent}>
                                <strong>Public Album Layout:</strong> This is the layout for the public album view. Use{" "}
                                <strong>drag-and-drop</strong> to reorder files as they will appear when this album is
                                shared publicly.
                            </div>
                        </div>
                    )}
                    {albumToken && sortField !== "layout" && (
                        <div className={styles.albumOrderInfo}>
                            <i className="bi bi-info-circle"></i>
                            <div className={styles.infoContent}>
                                <strong>Drag-Drop Disabled:</strong> File reordering is disabled when using sort
                                options. Select <strong>Layout</strong> to modify the public album view and enable
                                drag-and-drop reordering.
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div
                ref={fileListRef}
                className={`${styles.fileContainer} ${styles[viewMode]}`}
                onContextMenu={e => handleContextMenu(e)}
                onDragOver={undefined}
                onDrop={undefined}
            >
                {viewMode === "grid" && (
                    <div className={styles.fileGrid}>
                        {previewFiles.map((file, index) => (
                            <div
                                key={`grid-${file.id}`}
                                className={`${styles.fileItem} ${selectedFiles.has(file.id) ? styles.selected : ""} ${
                                    draggedFiles.includes(file.id) ? styles.dragging : ""
                                } ${draggedOverFile === file.id ? styles.dragOver : ""} ${mode === "public" ? styles.noReorder : ""}`}
                                onClick={e => handleFileSelect(file.id, e)}
                                onContextMenu={e => handleContextMenu(e, file.id)}
                                draggable={true}
                                onDragStart={e => handleDragStart(e, file.id)}
                                onDragOver={
                                    allowReorder && !isDraggingToAlbum && !isSearchActive
                                        ? e => handleDragOver(e, file.id)
                                        : undefined
                                }
                                onDragLeave={
                                    allowReorder && !isDraggingToAlbum && !isSearchActive ? handleDragLeave : undefined
                                }
                                onDrop={
                                    allowReorder && !isDraggingToAlbum && !isSearchActive
                                        ? e => handleDrop(e, file.id)
                                        : undefined
                                }
                                onDragEnd={handleDragEnd}
                            >
                                <div className={styles.filePreviewContainer}>
                                    <FilePreview
                                        file={file}
                                        size="large"
                                        lazy={showPagination}
                                        priority={index < 8}
                                        publicToken={publicToken}
                                    />
                                    <div className={styles.fileOverlay}>
                                        <Button
                                            size="small"
                                            variant="primary"
                                            onClick={() => window.open(file.url, "_blank")}
                                        >
                                            View
                                        </Button>
                                    </div>
                                </div>

                                <div className={styles.fileInfo}>
                                    <Tooltip content={file.fileName}>
                                        <div className={styles.fileName}>{renderFileName(file)}</div>
                                    </Tooltip>
                                    <div className={styles.fileDetails}>
                                        <span className={styles.fileSize}>{formatFileSize(file.fileSize)}</span>
                                        <span className={styles.fileDate}>{formatDate(file.createdAt)}</span>
                                    </div>
                                    {!albumToken && getAlbumName(file) && (
                                        <Pill
                                            variant="info"
                                            size="medium"
                                            icon={<i className="bi bi-collection"></i>}
                                            text={getAlbumName(file)!}
                                            className={styles.albumPill}
                                            tooltip={true}
                                        />
                                    )}
                                    {file.expires && (
                                        <div className={styles.expiresInfo}>Expires: {formatExpires(file.expires)}</div>
                                    )}
                                </div>

                                {allowSelection && (
                                    <div className={styles.selectCheckbox} onClick={e => e.stopPropagation()}>
                                        {renderFileCheckbox(file.id)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {(viewMode === "list" || viewMode === "detailed") && (
                    <div className={styles.fileList}>
                        {viewMode === "detailed" && (
                            <div className={styles.listHeader}>
                                {allowSelection && <div className={styles.headerCellCheckbox}></div>}
                                <div className={styles.headerCellIcon}></div>
                                <div className={styles.headerCellName}>Name</div>
                                <div className={styles.headerCell}>Size</div>
                                <div className={styles.headerCell}>Type</div>
                                <div className={styles.headerCell}>Date</div>
                                <div className={styles.headerCellActions}>Actions</div>
                            </div>
                        )}
                        {previewFiles.map(file => {
                            const fileIconData = getFileIcon(file);
                            return (
                                <div
                                    key={`list-${file.id}`}
                                    className={`${styles.fileListItem} ${selectedFiles.has(file.id) ? styles.selected : ""} ${
                                        draggedFiles.includes(file.id) ? styles.dragging : ""
                                    } ${draggedOverFile === file.id ? styles.dragOver : ""} ${mode === "public" ? styles.noReorder : ""}`}
                                    onClick={e => handleFileSelect(file.id, e)}
                                    onContextMenu={e => handleContextMenu(e, file.id)}
                                    draggable={true}
                                    onDragStart={e => handleDragStart(e, file.id)}
                                    onDragOver={
                                        allowReorder && !isDraggingToAlbum && !isSearchActive
                                            ? e => handleDragOver(e, file.id)
                                            : undefined
                                    }
                                    onDragLeave={
                                        allowReorder && !isDraggingToAlbum && !isSearchActive
                                            ? handleDragLeave
                                            : undefined
                                    }
                                    onDrop={
                                        allowReorder && !isDraggingToAlbum && !isSearchActive
                                            ? e => handleDrop(e, file.id)
                                            : undefined
                                    }
                                    onDragEnd={handleDragEnd}
                                >
                                    {allowSelection && (
                                        <div className={styles.fileListCheckbox} onClick={e => e.stopPropagation()}>
                                            {renderFileCheckbox(file.id)}
                                        </div>
                                    )}

                                    <div className={styles.fileListIcon} style={{ color: fileIconData.color }}>
                                        {fileIconData.icon}
                                    </div>

                                    <div className={styles.fileListName}>
                                        <div className={styles.nameWithBadge}>
                                            {renderFileName(file)}
                                            {!albumToken && getAlbumName(file) && (
                                                <Pill
                                                    variant="info"
                                                    size="medium"
                                                    icon={<i className="bi bi-collection"></i>}
                                                    text={getAlbumName(file)!}
                                                    tooltip={true}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {viewMode === "detailed" && (
                                        <>
                                            <div className={styles.fileListSize}>{formatFileSize(file.fileSize)}</div>
                                            <div className={styles.fileListType}>
                                                {file.fileName.split(".").pop()?.toUpperCase() || "FILE"}
                                            </div>
                                            <div className={styles.fileListDate}>{formatDate(file.createdAt)}</div>
                                            <div className={styles.fileListActions}>
                                                <Button
                                                    size="small"
                                                    variant="outline"
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        window.open(file.url, "_blank");
                                                    }}
                                                >
                                                    <i className="bi bi-box-arrow-up-right"></i>
                                                </Button>
                                            </div>
                                        </>
                                    )}

                                    {viewMode === "list" && (
                                        <div className={styles.fileListActions}>
                                            <Button
                                                size="small"
                                                variant="ghost"
                                                onClick={(e: React.MouseEvent) => {
                                                    e.stopPropagation();
                                                    window.open(file.url, "_blank");
                                                }}
                                            >
                                                <i className="bi bi-box-arrow-up-right"></i>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                items={contextMenu.items}
                onClose={hideContextMenu}
            />

            {showPagination && totalPages > 1 && (
                <div className={styles.paginationContainer}>
                    <div className={styles.pagination}>
                        <Button
                            variant="outline"
                            size="small"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <i className="bi bi-chevron-left"></i>
                        </Button>

                        {currentPage > 5 && (
                            <>
                                <Button variant="outline" size="small" onClick={() => handlePageChange(1)}>
                                    {1}
                                </Button>
                                <span className={styles.ellipsis}>...</span>
                            </>
                        )}

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let page: number;
                            if (totalPages <= 5) {
                                page = i + 1;
                            } else if (currentPage <= 3) {
                                page = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                page = totalPages - 4 + i;
                            } else {
                                page = currentPage - 2 + i;
                            }

                            return (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "primary" : "outline"}
                                    size="small"
                                    onClick={() => handlePageChange(page)}
                                >
                                    {page}
                                </Button>
                            );
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                            <>
                                <span className={styles.ellipsis}>...</span>
                                <Button variant="outline" size="small" onClick={() => handlePageChange(totalPages)}>
                                    {totalPages}
                                </Button>
                            </>
                        )}

                        <Button
                            variant="outline"
                            size="small"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <i className="bi bi-chevron-right"></i>
                        </Button>
                    </div>

                    <div className={styles.paginationInfo}>
                        Showing {startIndex + 1}-{Math.min(endIndex, sortedFiles.length)} of {sortedFiles.length} files
                    </div>
                </div>
            )}

            {allowUpload && (
                <FileUploadModal
                    isOpen={uploadModal.isOpen}
                    onClose={handleUploadClose}
                    bucketToken={bucketToken}
                    albumToken={uploadModal.albumToken}
                    albumName={uploadModal.albumName}
                    currentAlbumFileCount={uploadModal.albumToken ? filteredFiles.length : 0}
                    bucketType={bucketType}
                    onUploadComplete={handleUploadCompleteInternal}
                />
            )}

            <ConfirmDialog
                isOpen={deleteFilesDialog.isOpen}
                onCancel={handleDeleteFilesCancel}
                onConfirm={handleDeleteFilesConfirm}
                title="Delete Files"
                message="Are you sure you want to delete these file(s) ?"
                confirmText="Delete File(s)"
                confirmIcon="bi bi-trash-fill"
                cancelText="Cancel"
            ></ConfirmDialog>
        </div>
    );
}
