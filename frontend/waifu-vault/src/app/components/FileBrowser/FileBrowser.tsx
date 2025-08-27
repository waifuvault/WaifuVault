"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../Button";
import styles from "./FileBrowser.module.scss";
import type { UrlFileMixin } from "../../../../../../src/model/dto/AdminBucketDto.js";
import type { AdminFileData } from "../../../../../../src/model/dto/AdminData.js";

type ViewMode = "grid" | "list" | "detailed";
type SortField = "name" | "date" | "size" | "type";
type SortOrder = "asc" | "desc";

interface FileItem {
    id: number;
    fileName: string;
    fileSize?: number;
    createdAt: string | Date;
    url: string;
    expires?: string;
    addedToAlbumOrder?: number | null;
}

interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    fileId?: number;
}

interface FileBrowserProps {
    files: AdminFileData[] | UrlFileMixin[];
    onFilesSelected?: (fileIds: number[]) => void;
    onDeleteFiles?: (fileIds: number[]) => Promise<void>;
    onRenameFile?: (fileId: number, newName: string) => Promise<void>;
    onCopyFiles?: (fileIds: number[]) => Promise<void>;
    onMoveFiles?: (fileIds: number[]) => Promise<void>;
    onLogout?: () => void;
    showSearch?: boolean;
    showSort?: boolean;
    showViewToggle?: boolean;
    allowSelection?: boolean;
    allowDeletion?: boolean;
    allowRename?: boolean;
    allowCopy?: boolean;
    allowMove?: boolean;
    mode: "bucket" | "admin";
}

export function FileBrowser({
    files,
    onFilesSelected,
    onDeleteFiles,
    onRenameFile,
    onCopyFiles,
    onMoveFiles,
    onLogout,
    showSearch = true,
    showSort = true,
    showViewToggle = true,
    allowSelection = true,
    allowDeletion = true,
    allowRename = true,
    allowCopy = true,
    allowMove = true,
}: FileBrowserProps) {
    const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
    const [lastSelectedFile, setLastSelectedFile] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
    const [draggedFiles, setDraggedFiles] = useState<number[]>([]);
    const [isRenaming, setIsRenaming] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const fileListRef = useRef<HTMLDivElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Helper function for file type detection
    const getFileType = useCallback((filename: string) => {
        return filename.split(".").pop()?.toLowerCase() || "unknown";
    }, []);

    // Filter and sort files
    const filteredFiles = useMemo(() => {
        return files.filter(file => {
            const searchLower = searchQuery.toLowerCase();
            return (
                file.fileName.toLowerCase().includes(searchLower) || getFileType(file.fileName).includes(searchLower)
            );
        });
    }, [files, searchQuery, getFileType]);

    const sortedFiles = useMemo(() => {
        return [...filteredFiles].sort((a, b) => {
            let comparison = 0;

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
                    comparison = getFileType(a.fileName).localeCompare(getFileType(b.fileName));
                    break;
                case "name":
                default:
                    comparison = a.fileName.localeCompare(b.fileName);
                    break;
            }

            return sortOrder === "asc" ? comparison : -comparison;
        });
    }, [filteredFiles, sortField, sortOrder, getFileType]);

    // Close context menu when clicking elsewhere
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setContextMenu({ visible: false, x: 0, y: 0 });
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case "a":
                        event.preventDefault();
                        handleSelectAll();
                        break;
                    case "c":
                        if (selectedFiles.size > 0 && allowCopy) {
                            event.preventDefault();
                            handleCopyFiles();
                        }
                        break;
                    case "x":
                        if (selectedFiles.size > 0 && allowMove) {
                            event.preventDefault();
                            handleCutFiles();
                        }
                        break;
                }
            } else if (event.key === "Delete" && selectedFiles.size > 0 && allowDeletion) {
                event.preventDefault();
                handleDeleteSelected();
            } else if (event.key === "Escape") {
                setSelectedFiles(new Set());
                setContextMenu({ visible: false, x: 0, y: 0 });
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [selectedFiles, allowCopy, allowMove, allowDeletion]);

    const handleFileSelect = useCallback(
        (fileId: number, event?: React.MouseEvent) => {
            if (!allowSelection) return;

            let newSelected = new Set(selectedFiles);

            if (event?.ctrlKey || event?.metaKey) {
                // Ctrl/Cmd + Click: Toggle selection
                if (newSelected.has(fileId)) {
                    newSelected.delete(fileId);
                } else {
                    newSelected.add(fileId);
                }
            } else if (event?.shiftKey && lastSelectedFile !== null) {
                // Shift + Click: Select range
                const fileIds = sortedFiles.map(f => f.id);
                const startIndex = fileIds.indexOf(lastSelectedFile);
                const endIndex = fileIds.indexOf(fileId);
                const [start, end] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];

                for (let i = start; i <= end; i++) {
                    newSelected.add(fileIds[i]);
                }
            } else {
                // Regular click: Select only this file
                newSelected = new Set([fileId]);
            }

            setSelectedFiles(newSelected);
            setLastSelectedFile(fileId);
            onFilesSelected?.(Array.from(newSelected));
        },
        [selectedFiles, lastSelectedFile, sortedFiles, allowSelection, onFilesSelected],
    );

    const handleSelectAll = useCallback(() => {
        const allFileIds = new Set(sortedFiles.map(f => f.id));
        setSelectedFiles(allFileIds);
        onFilesSelected?.(Array.from(allFileIds));
    }, [sortedFiles, onFilesSelected]);

    const handleClearSelection = useCallback(() => {
        setSelectedFiles(new Set());
        onFilesSelected?.([]);
    }, [onFilesSelected]);

    const handleDeleteSelected = useCallback(async () => {
        if (!allowDeletion || selectedFiles.size === 0 || !onDeleteFiles) return;

        if (confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)?`)) {
            await onDeleteFiles(Array.from(selectedFiles));
            setSelectedFiles(new Set());
        }
    }, [allowDeletion, selectedFiles, onDeleteFiles]);

    const handleCopyFiles = useCallback(async () => {
        if (!allowCopy || selectedFiles.size === 0 || !onCopyFiles) return;
        await onCopyFiles(Array.from(selectedFiles));
    }, [allowCopy, selectedFiles, onCopyFiles]);

    const handleCutFiles = useCallback(async () => {
        if (!allowMove || selectedFiles.size === 0 || !onMoveFiles) return;
        await onMoveFiles(Array.from(selectedFiles));
    }, [allowMove, selectedFiles, onMoveFiles]);

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

    const handleContextMenu = useCallback((event: React.MouseEvent, fileId?: number) => {
        event.preventDefault();
        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            fileId,
        });
    }, []);

    const handleDragStart = useCallback(
        (event: React.DragEvent, fileId: number) => {
            const selectedFileIds = selectedFiles.has(fileId) ? Array.from(selectedFiles) : [fileId];
            setDraggedFiles(selectedFileIds);
            event.dataTransfer.setData("text/plain", selectedFileIds.join(","));
            event.dataTransfer.effectAllowed = "move";
        },
        [selectedFiles],
    );

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        // Handle file reordering logic here
        setDraggedFiles([]);
    }, []);

    const getFileIcon = useCallback((filename: string) => {
        const ext = filename?.split(".").pop()?.toLowerCase();
        switch (ext) {
            case "jpg":
            case "jpeg":
            case "png":
            case "gif":
            case "webp":
            case "svg":
            case "bmp":
                return { icon: "🖼️", color: "#4CAF50" };
            case "mp4":
            case "mov":
            case "avi":
            case "webm":
            case "mkv":
                return { icon: "🎥", color: "#F44336" };
            case "mp3":
            case "wav":
            case "flac":
            case "ogg":
            case "aac":
                return { icon: "🎵", color: "#9C27B0" };
            case "pdf":
                return { icon: "📄", color: "#F44336" };
            case "txt":
            case "md":
            case "rtf":
                return { icon: "📝", color: "#2196F3" };
            case "zip":
            case "rar":
            case "7z":
            case "tar":
            case "gz":
                return { icon: "📦", color: "#FF9800" };
            case "js":
            case "ts":
            case "jsx":
            case "tsx":
                return { icon: "⚡", color: "#FFD600" };
            case "css":
            case "scss":
            case "sass":
                return { icon: "🎨", color: "#2196F3" };
            case "html":
            case "htm":
                return { icon: "🌐", color: "#FF5722" };
            case "json":
            case "xml":
                return { icon: "📋", color: "#4CAF50" };
            default:
                return { icon: "📎", color: "#757575" };
        }
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
        if (!bytes) return "-";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }, []);

    const formatDate = useCallback((date: string | Date) => {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }, []);

    if (files.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>No files available.</p>
            </div>
        );
    }

    return (
        <div className={styles.fileBrowser}>
            {/* Enhanced Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    {showViewToggle && (
                        <div className={styles.viewControls}>
                            <button
                                className={`${styles.viewBtn} ${viewMode === "grid" ? styles.active : ""}`}
                                onClick={() => setViewMode("grid")}
                            >
                                ⚏
                            </button>
                            <button
                                className={`${styles.viewBtn} ${viewMode === "list" ? styles.active : ""}`}
                                onClick={() => setViewMode("list")}
                            >
                                ☰
                            </button>
                            <button
                                className={`${styles.viewBtn} ${viewMode === "detailed" ? styles.active : ""}`}
                                onClick={() => setViewMode("detailed")}
                            >
                                ≣
                            </button>
                        </div>
                    )}

                    <div className={styles.selectionInfo}>
                        {selectedFiles.size > 0 && (
                            <span className={styles.selectionCount}>
                                {selectedFiles.size} of {sortedFiles.length} selected
                            </span>
                        )}
                    </div>
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
                                <button className={styles.searchClear} onClick={() => setSearchQuery("")}>
                                    ✕
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.toolbarRight}>
                    <div className={styles.fileActions}>
                        {selectedFiles.size > 0 && (
                            <>
                                {allowCopy && (
                                    <Button variant="outline" size="small" onClick={handleCopyFiles}>
                                        📋 Copy
                                    </Button>
                                )}
                                {allowMove && (
                                    <Button variant="outline" size="small" onClick={handleCutFiles}>
                                        ✂️ Cut
                                    </Button>
                                )}
                                {allowDeletion && (
                                    <Button
                                        variant="outline"
                                        size="small"
                                        onClick={handleDeleteSelected}
                                        className={styles.deleteBtn}
                                    >
                                        🗑️ Delete ({selectedFiles.size})
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
                        <button
                            className={`${styles.sortBtn} ${sortField === "name" ? styles.active : ""}`}
                            onClick={() => handleSort("name")}
                        >
                            Name {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                            className={`${styles.sortBtn} ${sortField === "date" ? styles.active : ""}`}
                            onClick={() => handleSort("date")}
                        >
                            Date {sortField === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                            className={`${styles.sortBtn} ${sortField === "size" ? styles.active : ""}`}
                            onClick={() => handleSort("size")}
                        >
                            Size {sortField === "size" && (sortOrder === "asc" ? "↑" : "↓")}
                        </button>
                        <button
                            className={`${styles.sortBtn} ${sortField === "type" ? styles.active : ""}`}
                            onClick={() => handleSort("type")}
                        >
                            Type {sortField === "type" && (sortOrder === "asc" ? "↑" : "↓")}
                        </button>
                    </div>
                </div>
            )}

            <div
                ref={fileListRef}
                className={`${styles.fileContainer} ${styles[viewMode]}`}
                onContextMenu={e => handleContextMenu(e)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className={styles.fileGrid}>
                    {sortedFiles.map(file => {
                        const fileIconData = getFileIcon(file.fileName);
                        return (
                            <div
                                key={file.id}
                                className={`${styles.fileItem} ${selectedFiles.has(file.id) ? styles.selected : ""} ${
                                    draggedFiles.includes(file.id) ? styles.dragging : ""
                                }`}
                                onClick={e => handleFileSelect(file.id, e)}
                                onContextMenu={e => handleContextMenu(e, file.id)}
                                onDoubleClick={() => window.open(file.url, "_blank")}
                                draggable
                                onDragStart={e => handleDragStart(e, file.id)}
                            >
                                <div className={styles.filePreview}>
                                    <div className={styles.fileIcon} style={{ color: fileIconData.color }}>
                                        {fileIconData.icon}
                                    </div>
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
                                    <div className={styles.fileName} title={file.fileName}>
                                        {isRenaming === file.id ? (
                                            <input
                                                type="text"
                                                value={renameValue}
                                                onChange={e => setRenameValue(e.target.value)}
                                                onBlur={handleRenameComplete}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") handleRenameComplete();
                                                    if (e.key === "Escape") {
                                                        setIsRenaming(null);
                                                        setRenameValue("");
                                                    }
                                                }}
                                                className={styles.renameInput}
                                                autoFocus
                                            />
                                        ) : (
                                            file.fileName
                                        )}
                                    </div>
                                    <div className={styles.fileDetails}>
                                        <span className={styles.fileSize}>{formatFileSize(file.fileSize)}</span>
                                        <span className={styles.fileDate}>{formatDate(file.createdAt)}</span>
                                    </div>
                                    {file.expires && <div className={styles.expiresInfo}>Expires: {file.expires}</div>}
                                </div>

                                {allowSelection && (
                                    <div className={styles.selectCheckbox}>
                                        <input
                                            type="checkbox"
                                            checked={selectedFiles.has(file.id)}
                                            onChange={e => {
                                                e.stopPropagation();
                                                handleFileSelect(file.id);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    ref={contextMenuRef}
                    className={styles.contextMenu}
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.fileId ? (
                        (() => {
                            const file = sortedFiles.find(f => f.id === contextMenu.fileId);
                            if (!file) return null;
                            return (
                                <>
                                    <button
                                        className={styles.contextMenuItem}
                                        onClick={() => {
                                            window.open(file.url, "_blank");
                                            setContextMenu({ visible: false, x: 0, y: 0 });
                                        }}
                                    >
                                        🔗 Open
                                    </button>
                                    {allowRename && (
                                        <button
                                            className={styles.contextMenuItem}
                                            onClick={() => {
                                                handleRenameStart(file.id, file.fileName);
                                                setContextMenu({ visible: false, x: 0, y: 0 });
                                            }}
                                        >
                                            ✏️ Rename
                                        </button>
                                    )}
                                    {allowCopy && (
                                        <button
                                            className={styles.contextMenuItem}
                                            onClick={() => {
                                                handleCopyFiles();
                                                setContextMenu({ visible: false, x: 0, y: 0 });
                                            }}
                                        >
                                            📋 Copy
                                        </button>
                                    )}
                                    {allowMove && (
                                        <button
                                            className={styles.contextMenuItem}
                                            onClick={() => {
                                                handleCutFiles();
                                                setContextMenu({ visible: false, x: 0, y: 0 });
                                            }}
                                        >
                                            ✂️ Cut
                                        </button>
                                    )}
                                    <div className={styles.contextMenuSeparator} />
                                    {allowDeletion && (
                                        <button
                                            className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
                                            onClick={() => {
                                                handleDeleteSelected();
                                                setContextMenu({ visible: false, x: 0, y: 0 });
                                            }}
                                        >
                                            🗑️ Delete
                                        </button>
                                    )}
                                </>
                            );
                        })()
                    ) : (
                        <>
                            <button
                                className={styles.contextMenuItem}
                                onClick={() => {
                                    handleSelectAll();
                                    setContextMenu({ visible: false, x: 0, y: 0 });
                                }}
                            >
                                ✓ Select All
                            </button>
                            {selectedFiles.size > 0 && (
                                <button
                                    className={styles.contextMenuItem}
                                    onClick={() => {
                                        handleClearSelection();
                                        setContextMenu({ visible: false, x: 0, y: 0 });
                                    }}
                                >
                                    ✕ Clear Selection
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
