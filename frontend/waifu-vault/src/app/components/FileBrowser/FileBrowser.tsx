"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../Button/Button";
import Pill from "../Pill/Pill";
import { FilePreview } from "./FilePreview";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";
import { useContextMenu } from "../../hooks/useContextMenu";
import styles from "./FileBrowser.module.scss";
import type { AdminFileData, UrlFileMixin } from "@/types/AdminTypes";

type ViewMode = "grid" | "list" | "detailed";
type SortField = "name" | "date" | "size" | "type";
type SortOrder = "asc" | "desc";

interface FileBrowserProps {
    files: AdminFileData[] | UrlFileMixin[];
    albums?: { token: string; name: string }[];
    onFilesSelected?: (fileIds: number[]) => void;
    onDeleteFiles?: (fileIds: number[]) => Promise<void>;
    onRenameFile?: (fileId: number, newName: string) => Promise<void>;
    onReorderFiles?: (
        fileId: number,
        oldPosition: number,
        newPosition: number,
        showSuccessToast?: boolean,
    ) => Promise<void>;
    onDragStart?: (isDraggingToAlbum: boolean) => void;
    onDragEnd?: () => void;
    onLogout?: () => void;
    showSearch?: boolean;
    showSort?: boolean;
    showViewToggle?: boolean;
    allowSelection?: boolean;
    allowDeletion?: boolean;
    allowRename?: boolean;
    allowReorder?: boolean;
    albumToken?: string;
    mode: "bucket" | "admin";
}

export function FileBrowser({
    files,
    albums,
    onFilesSelected,
    onDeleteFiles,
    onRenameFile,
    onReorderFiles,
    onDragStart,
    onDragEnd,
    onLogout,
    showSearch = true,
    showSort = true,
    showViewToggle = true,
    allowSelection = true,
    allowDeletion = true,
    allowRename = true,
    allowReorder = false,
    albumToken,
}: FileBrowserProps) {
    const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
    const [lastSelectedFile, setLastSelectedFile] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
    const [draggedFiles, setDraggedFiles] = useState<number[]>([]);
    const [isRenaming, setIsRenaming] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [draggedOverFile, setDraggedOverFile] = useState<number | null>(null);
    const [isDraggingToAlbum, setIsDraggingToAlbum] = useState(false);

    const fileListRef = useRef<HTMLDivElement>(null);

    const filteredFiles = useMemo(() => {
        return files.filter(file => {
            const searchLower = searchQuery.toLowerCase();
            return (
                file.originalFileName.toLowerCase().includes(searchLower) ??
                file.originalFileName?.includes(searchLower)
            );
        });
    }, [files, searchQuery]);

    const sortedFiles = useMemo(() => {
        return [...filteredFiles].sort((a, b) => {
            if (albumToken && "addedToAlbumOrder" in a && "addedToAlbumOrder" in b) {
                const orderA = a.addedToAlbumOrder ?? Infinity;
                const orderB = b.addedToAlbumOrder ?? Infinity;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
            }

            let comparison: number;

            switch (sortField) {
                case "date":
                    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
                    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
                    comparison = dateA.getTime() - dateB.getTime();
                    break;
                case "size":
                    comparison = (a.fileSize || 0) - (b.fileSize || 0);
                    break;
                case "type":
                    const aFileExtension = a?.fileExtension?.toLowerCase() ?? "";
                    const bFileExtension = b?.fileExtension?.toLowerCase() ?? "";
                    comparison = aFileExtension.localeCompare(bFileExtension);
                    break;
                case "name":
                default:
                    comparison = a.originalFileName.localeCompare(b.originalFileName);
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

    const previewFiles = sortedFiles;

    const handleClearSelection = useCallback(() => {
        setSelectedFiles(new Set());
        onFilesSelected?.([]);
    }, [onFilesSelected]);

    const handleDeleteSelected = useCallback(async () => {
        if (!allowDeletion || selectedFiles.size === 0 || !onDeleteFiles) {
            return;
        }

        if (confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)?`)) {
            await onDeleteFiles(Array.from(selectedFiles));
            setSelectedFiles(new Set());
        }
    }, [allowDeletion, selectedFiles, onDeleteFiles]);

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
                handleDeleteSelected();
            } else if (event.key === "Escape") {
                setSelectedFiles(new Set());
                hideContextMenu();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedFiles, allowDeletion, handleSelectAll, handleDeleteSelected, hideContextMenu]);

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

    const handleRenameStart = useCallback((fileId: number, currentName: string) => {
        setIsRenaming(fileId);
        setRenameValue(currentName);
    }, []);

    const handleRenameComplete = useCallback(async () => {
        if (isRenaming && onRenameFile && renameValue.trim()) {
            await onRenameFile(isRenaming, renameValue.trim());
        }
        setIsRenaming(null);
        setRenameValue("");
    }, [isRenaming, onRenameFile, renameValue]);

    const handleContextMenu = useCallback(
        (event: React.MouseEvent, fileId?: number) => {
            const file = fileId ? sortedFiles.find(f => f.id === fileId) : null;

            const contextMenuItems: ContextMenuItem[] = [];

            if (file) {
                contextMenuItems.push({
                    id: "open",
                    label: "Open",
                    icon: <i className="bi bi-box-arrow-up-right"></i>,
                    onClick: () => window.open(file.url, "_blank"),
                });

                if (allowRename) {
                    contextMenuItems.push({
                        id: "rename",
                        label: "Rename",
                        icon: <i className="bi bi-pencil"></i>,
                        onClick: () => handleRenameStart(file.id, file.fileName || file.originalFileName),
                    });
                }

                if (allowDeletion) {
                    contextMenuItems.push({
                        id: "delete",
                        label: "Delete",
                        icon: <i className="bi bi-trash"></i>,
                        onClick: handleDeleteSelected,
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

            showContextMenu(event, contextMenuItems);
        },
        [
            sortedFiles,
            allowRename,
            allowDeletion,
            selectedFiles.size,
            handleRenameStart,
            handleDeleteSelected,
            handleSelectAll,
            handleClearSelection,
            showContextMenu,
        ],
    );

    const getFileToken = useCallback((file: UrlFileMixin | AdminFileData): string => {
        if ("fileToken" in file) {
            return file.fileToken;
        }
        return file.token;
    }, []);

    const handleDragStart = useCallback(
        (event: React.DragEvent, fileId: number) => {
            const selectedFileIds = selectedFiles.has(fileId) ? Array.from(selectedFiles) : [fileId];
            const draggedFileTokens = selectedFileIds
                .map(id => {
                    const file = sortedFiles.find(f => f.id === id);
                    return file ? getFileToken(file) : "";
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

            const isDraggingToAlbum = !allowReorder || !albumToken;
            if (isDraggingToAlbum) {
                setIsDraggingToAlbum(true);
                onDragStart?.(true);
            } else {
                onDragStart?.(false);
            }
        },
        [selectedFiles, allowReorder, albumToken, sortedFiles, getFileToken, onDragStart],
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent, targetFileId: number) => {
            if (!allowReorder || isDraggingToAlbum) {
                return;
            }

            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            setDraggedOverFile(targetFileId);
        },
        [allowReorder, isDraggingToAlbum],
    );

    const handleDragLeave = useCallback(
        (e: React.DragEvent) => {
            if (!allowReorder || isDraggingToAlbum) {
                return;
            }

            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDraggedOverFile(null);
            }
        },
        [allowReorder, isDraggingToAlbum],
    );

    const handleDrop = useCallback(
        async (e: React.DragEvent, targetFileId: number) => {
            if (!allowReorder || !onReorderFiles || isDraggingToAlbum) {
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
                console.error("Failed to reorder files:", error);
                console.error("Error details:", error);
            }
        },
        [allowReorder, onReorderFiles, isDraggingToAlbum, draggedFiles, sortedFiles],
    );

    const handleDragEnd = useCallback(() => {
        setDraggedFiles([]);
        setDraggedOverFile(null);
        setIsDraggingToAlbum(false);
        onDragEnd?.();
    }, [onDragEnd]);

    const renderFileName = useCallback(
        (file: { id: number; originalFileName: string }) => {
            return isRenaming === file.id ? (
                <input
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={handleRenameComplete}
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            handleRenameComplete();
                        }
                        if (e.key === "Escape") {
                            setIsRenaming(null);
                            setRenameValue("");
                        }
                    }}
                    className={styles.renameInput}
                    autoFocus
                />
            ) : (
                file.originalFileName
            );
        },
        [isRenaming, renameValue, handleRenameComplete],
    );

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

    const getFileIcon = useCallback((file: AdminFileData | UrlFileMixin) => {
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
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
            } else {
                setSortField(field);
                setSortOrder("asc");
            }
        },
        [sortField, sortOrder],
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

    const getAlbumName = useCallback(
        (file: UrlFileMixin | AdminFileData): string | null => {
            if ("__album__" in file && file.__album__) {
                return file.__album__.name;
            }

            if ("albumToken" in file && file.albumToken && albums) {
                const album = albums.find(a => a.token === file.albumToken);
                return album ? album.name : null;
            }

            return null;
        },
        [albums],
    );

    if (files.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>No files available.</p>
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
                                onClick={() => setViewMode("grid")}
                            >
                                <i className="bi bi-grid-3x3"></i> Grid
                            </Button>
                            <Button
                                variant={viewMode === "list" ? "primary" : "outline"}
                                size="small"
                                onClick={() => setViewMode("list")}
                            >
                                <i className="bi bi-list"></i> List
                            </Button>
                            <Button
                                variant={viewMode === "detailed" ? "primary" : "outline"}
                                size="small"
                                onClick={() => setViewMode("detailed")}
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
                            <input
                                type="text"
                                placeholder="Search files and types..."
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <Button variant="outline" size="small" onClick={() => setSearchQuery("")}>
                                    <i className="bi bi-x"></i>
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.toolbarRight}>
                    <div className={styles.fileActions}>
                        {selectedFiles.size > 0 && (
                            <>
                                {allowDeletion && (
                                    <Button
                                        variant="outline"
                                        size="small"
                                        onClick={handleDeleteSelected}
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
                    </div>
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
                        {previewFiles.map(file => {
                            return (
                                <div
                                    key={file.id}
                                    className={`${styles.fileItem} ${selectedFiles.has(file.id) ? styles.selected : ""} ${
                                        draggedFiles.includes(file.id) ? styles.dragging : ""
                                    } ${draggedOverFile === file.id ? styles.dragOver : ""}`}
                                    onClick={e => handleFileSelect(file.id, e)}
                                    onContextMenu={e => handleContextMenu(e, file.id)}
                                    draggable={true}
                                    onDragStart={e => handleDragStart(e, file.id)}
                                    onDragOver={
                                        allowReorder && !isDraggingToAlbum ? e => handleDragOver(e, file.id) : undefined
                                    }
                                    onDragLeave={allowReorder && !isDraggingToAlbum ? handleDragLeave : undefined}
                                    onDrop={
                                        allowReorder && !isDraggingToAlbum ? e => handleDrop(e, file.id) : undefined
                                    }
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className={styles.filePreviewContainer}>
                                        <FilePreview file={file} size="large" />
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
                                        <div className={styles.fileName} title={file.originalFileName}>
                                            {renderFileName(file)}
                                        </div>
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
                                            <div className={styles.expiresInfo}>
                                                Expires:{" "}
                                                {formatDate(
                                                    typeof file.expires === "number"
                                                        ? new Date(file.expires)
                                                        : file.expires,
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {allowSelection && (
                                        <div className={styles.selectCheckbox} onClick={e => e.stopPropagation()}>
                                            {renderFileCheckbox(file.id)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {(viewMode === "list" || viewMode === "detailed") && (
                    <div className={styles.fileList}>
                        {viewMode === "detailed" && (
                            <div className={styles.listHeader}>
                                <div className={styles.headerCell}>Name</div>
                                <div className={styles.headerCell}>Size</div>
                                <div className={styles.headerCell}>Type</div>
                                <div className={styles.headerCell}>Date</div>
                            </div>
                        )}
                        {previewFiles.map(file => {
                            const fileIconData = getFileIcon(file);
                            return (
                                <div
                                    key={file.id}
                                    className={`${styles.fileListItem} ${selectedFiles.has(file.id) ? styles.selected : ""} ${
                                        draggedFiles.includes(file.id) ? styles.dragging : ""
                                    } ${draggedOverFile === file.id ? styles.dragOver : ""}`}
                                    onClick={e => handleFileSelect(file.id, e)}
                                    onContextMenu={e => handleContextMenu(e, file.id)}
                                    draggable={true}
                                    onDragStart={e => handleDragStart(e, file.id)}
                                    onDragOver={
                                        allowReorder && !isDraggingToAlbum ? e => handleDragOver(e, file.id) : undefined
                                    }
                                    onDragLeave={allowReorder && !isDraggingToAlbum ? handleDragLeave : undefined}
                                    onDrop={
                                        allowReorder && !isDraggingToAlbum ? e => handleDrop(e, file.id) : undefined
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
                                                {file.originalFileName.split(".").pop()?.toUpperCase() || "FILE"}
                                            </div>
                                            <div className={styles.fileListDate}>{formatDate(file.createdAt)}</div>
                                        </>
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
        </div>
    );
}
