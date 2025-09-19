"use client";

import React, { DragEvent, FormEvent, MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./AlbumSidebar.module.scss";
import { Button, ContextMenu, type ContextMenuItem, Input, Tooltip } from "@/app/components";
import { useContextMenu, useErrorHandler } from "@/app/hooks";
import {
    ALBUM_SIDEBAR_COLLAPSED_KEY,
    ALBUM_SORT_BY_KEY,
    ALBUM_SORT_DIR_KEY,
    LocalStorage,
    PINNED_ALBUMS_KEY,
} from "@/constants/localStorageKeys";
import type { AlbumInfo } from "@/app/types";
import { useLoading } from "@/app/contexts";

interface AlbumSidebarProps {
    albums: AlbumInfo[];
    selectedAlbum: string | null;
    onAlbumSelect: (albumToken: string | null) => void;
    onCreateAlbum: (name: string) => Promise<void>;
    onDeleteClick: (albumToken: string, albumName: string) => void;
    onFilesDropped?: (albumToken: string, fileTokens: string[]) => Promise<void>;
    onShareAlbum?: (albumToken: string) => Promise<void>;
    onUnshareAlbum?: (albumToken: string) => Promise<void>;
    onCopyPublicUrl?: (publicToken: string) => void;
    currentFilesCount?: number;
}

export function AlbumSidebar({
    albums,
    selectedAlbum,
    onAlbumSelect,
    onCreateAlbum,
    onDeleteClick,
    onFilesDropped,
    onShareAlbum,
    onUnshareAlbum,
    onCopyPublicUrl,
    currentFilesCount,
}: AlbumSidebarProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(() => LocalStorage.getBoolean(ALBUM_SIDEBAR_COLLAPSED_KEY, false));
    const [dragOverAlbum, setDragOverAlbum] = useState<string | null>(null);
    const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
    const { handleError } = useErrorHandler();
    const { isLoading } = useLoading();
    const [sortBy, setSortBy] = useState<"name" | "date">(
        () => LocalStorage.getString(ALBUM_SORT_BY_KEY, "name") as "name" | "date",
    );
    const [sortDir, setSortDir] = useState<"asc" | "desc">(
        () => LocalStorage.getString(ALBUM_SORT_DIR_KEY, "asc") as "asc" | "desc",
    );
    const [search, setSearch] = useState("");
    const [pins, setPins] = useState<string[]>([]);

    useEffect(() => LocalStorage.setBoolean(ALBUM_SIDEBAR_COLLAPSED_KEY, isCollapsed), [isCollapsed]);
    useEffect(() => LocalStorage.setString(ALBUM_SORT_BY_KEY, sortBy), [sortBy]);
    useEffect(() => LocalStorage.setString(ALBUM_SORT_DIR_KEY, sortDir), [sortDir]);
    useEffect(() => setPins(LocalStorage.getJson<string[]>(PINNED_ALBUMS_KEY, [])), []);

    const albumSort = useMemo(() => {
        return (a: AlbumInfo, b: AlbumInfo) => {
            if (sortBy === "name") {
                return sortDir === "asc"
                    ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
                    : b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
            }
            const ad = new Date(a.dateCreated).getTime();
            const bd = new Date(b.dateCreated).getTime();
            return sortDir === "asc" ? ad - bd : bd - ad;
        };
    }, [sortBy, sortDir]);

    const pinSort = useMemo(() => {
        return (a: AlbumInfo, b: AlbumInfo) => {
            const amod = pins.includes(a.token) ? 1 : 0;
            const bmod = pins.includes(b.token) ? 1 : 0;
            return bmod - amod;
        };
    }, [pins]);

    const handleCreateSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!newAlbumName.trim()) {
            return;
        }

        try {
            await onCreateAlbum(newAlbumName.trim());
            setNewAlbumName("");
            setIsCreating(false);
        } catch (error) {
            handleError(error, { defaultMessage: "Failed to create album" });
        }
    };

    const handleDeleteClick = useCallback(
        (albumToken: string, albumName: string) => {
            onDeleteClick(albumToken, albumName);
        },
        [onDeleteClick],
    );

    const handleShareClick = useCallback(
        async (albumToken: string) => {
            if (onShareAlbum) {
                await onShareAlbum(albumToken);
            }
        },
        [onShareAlbum],
    );

    const handleUnshareClick = useCallback(
        async (albumToken: string) => {
            if (onUnshareAlbum) {
                await onUnshareAlbum(albumToken);
            }
        },
        [onUnshareAlbum],
    );

    const handleCopyUrlClick = useCallback(
        (publicToken: string) => {
            if (onCopyPublicUrl) {
                onCopyPublicUrl(publicToken);
            }
        },
        [onCopyPublicUrl],
    );

    const handleToggleDirection = useCallback(() => {
        setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    }, []);

    const handleToggleSortType = useCallback(() => {
        setSortBy(prev => (prev === "name" ? "date" : "name"));
    }, []);

    const handlePinClick = useCallback(
        async (albumToken: string) => {
            if (pins.includes(albumToken)) {
                return;
            }
            try {
                const newPins = [...pins, albumToken];
                setPins(newPins);
                LocalStorage.setJson(PINNED_ALBUMS_KEY, newPins);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to pin album" });
            }
        },
        [pins, setPins, handleError],
    );

    const handleUnpinClick = useCallback(
        async (albumToken: string) => {
            try {
                const newPins = pins.filter(pin => pin !== albumToken);
                setPins(newPins);
                LocalStorage.setJson(PINNED_ALBUMS_KEY, newPins);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to unpin album" });
            }
        },
        [pins, setPins, handleError],
    );

    const handleAlbumContextMenu = useCallback(
        (event: MouseEvent, album: AlbumInfo) => {
            event.preventDefault();

            const contextMenuItems: ContextMenuItem[] = [];

            contextMenuItems.push({
                id: "sorttype",
                label: sortBy === "name" ? "Sort by Created" : "Sort Alphabetically",
                icon: <i className={`bi ${sortBy === "name" ? "bi-calendar-date" : "bi-sort-alpha-down"}`}></i>,
                onClick: () => handleToggleSortType(),
            });

            contextMenuItems.push({
                id: "sortdir",
                label: sortDir === "asc" ? "Sort Descending" : "Sort Ascending",
                icon: <i className={`bi ${sortDir === "asc" ? "bi-arrow-down" : "bi-arrow-up"}`}></i>,
                onClick: () => handleToggleDirection(),
            });

            if (album.publicToken) {
                contextMenuItems.push({
                    id: "copyUrl",
                    label: "Copy public URL",
                    icon: <i className="bi bi-link-45deg"></i>,
                    onClick: () => handleCopyUrlClick(album.publicToken!),
                });

                contextMenuItems.push({
                    id: "unshare",
                    label: "Unshare album",
                    icon: <i className="bi bi-share-fill"></i>,
                    onClick: () => handleUnshareClick(album.token),
                });
            } else {
                contextMenuItems.push({
                    id: "share",
                    label: "Share album",
                    icon: <i className="bi bi-share"></i>,
                    onClick: () => handleShareClick(album.token),
                });
            }

            if (pins.includes(album.token)) {
                contextMenuItems.push({
                    id: "unpin",
                    label: "Unpin album",
                    icon: <i className="bi bi-pin-angle-fill"></i>,
                    onClick: () => handleUnpinClick(album.token),
                });
            } else {
                contextMenuItems.push({
                    id: "pin",
                    label: "Pin album",
                    icon: <i className="bi bi-pin-angle"></i>,
                    onClick: () => handlePinClick(album.token),
                });
            }

            contextMenuItems.push({
                id: "delete",
                label: "Delete album",
                icon: <i className="bi bi-x"></i>,
                onClick: () => handleDeleteClick(album.token, album.name),
                variant: "danger" as const,
                separator: true,
            });

            showContextMenu(event.nativeEvent, contextMenuItems);
        },
        [
            sortBy,
            sortDir,
            pins,
            handleToggleSortType,
            handleToggleDirection,
            handleCopyUrlClick,
            handleUnshareClick,
            handleShareClick,
            handleDeleteClick,
            handlePinClick,
            handleUnpinClick,
            showContextMenu,
        ],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.currentTarget.value.toLowerCase());
    };

    const handleDragOver = (e: DragEvent, albumToken: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverAlbum(albumToken);
    };

    const handleDragLeave = (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverAlbum(null);
        }
    };

    const handleDrop = async (e: DragEvent, albumToken: string) => {
        e.preventDefault();
        setDragOverAlbum(null);

        try {
            const fileTokensData = e.dataTransfer.getData("application/json");
            if (fileTokensData && onFilesDropped) {
                const fileTokens = JSON.parse(fileTokensData);
                await onFilesDropped(albumToken, fileTokens);
            }
        } catch (error) {
            handleError(error, { defaultMessage: "Failed to drop files on album" });
        }
    };

    const selectedCount =
        currentFilesCount ??
        (selectedAlbum
            ? albums.find(a => a.token === selectedAlbum)?.fileCount || 0
            : albums.reduce((sum, a) => sum + (a.fileCount || 0), 0));

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>
            <div className={styles.header}>
                <Tooltip content={isCollapsed ? "Expand albums" : "Collapse albums"} position="right">
                    <Button
                        variant="ghost"
                        size="small"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={styles.toggleButton}
                    >
                        <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-left"}`}></i>
                    </Button>
                </Tooltip>

                {!isCollapsed && (
                    <>
                        <div className={styles.titleArea}>
                            <h3>Albums</h3>
                            <span className={styles.fileCount}>{selectedCount} files</span>
                        </div>
                        <Button
                            variant="outline"
                            size="small"
                            onClick={() => setIsCreating(true)}
                            disabled={isLoading || isCreating}
                            className={styles.addButton}
                        >
                            <i className="bi bi-plus"></i>
                        </Button>
                    </>
                )}
            </div>

            {!isCollapsed && (
                <>
                    <div className={styles.albumList}>
                        <Input
                            placeholder="Search albums..."
                            type="text"
                            id="search"
                            variant="search"
                            onChange={handleSearch}
                        />
                        <Button
                            variant="ghost"
                            size="small"
                            onClick={() => onAlbumSelect(null)}
                            disabled={isLoading}
                            className={`${styles.albumItem} ${selectedAlbum === null ? styles.active : ""}`}
                        >
                            <i className="bi bi-files"></i>
                            <span className={styles.albumName}>All Files</span>
                            <span className={styles.count}>
                                {selectedAlbum === null
                                    ? selectedCount
                                    : albums.reduce((sum, a) => sum + (a.fileCount || 0), 0)}
                            </span>
                        </Button>

                        {albums
                            .sort(albumSort)
                            .sort(pinSort)
                            .filter(a => a.name.toLowerCase().includes(search))
                            .map(album => (
                                <div
                                    key={album.token}
                                    className={`${styles.albumItemContainer} ${dragOverAlbum === album.token ? styles.dragOver : ""}`}
                                    onDragOver={e => handleDragOver(e, album.token)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={e => handleDrop(e, album.token)}
                                    onContextMenu={e => handleAlbumContextMenu(e, album)}
                                >
                                    <Button
                                        variant="ghost"
                                        size="small"
                                        onClick={() => onAlbumSelect(album.token)}
                                        disabled={isLoading}
                                        className={`${styles.albumItem} ${styles.nested} ${selectedAlbum === album.token ? styles.active : ""}`}
                                    >
                                        <i className="bi bi-collection"></i>
                                        <Tooltip content={album.name} position="right">
                                            {pins.includes(album.token) ? <i className="bi bi-pin-angle-fill"></i> : ""}
                                            <span className={styles.albumName}>{album.name}</span>
                                        </Tooltip>
                                        <span className={styles.count}>{album.fileCount || 0}</span>
                                    </Button>
                                    <div className={styles.albumActions}>
                                        {album.publicToken ? (
                                            <>
                                                <Tooltip content="Copy public URL">
                                                    <Button
                                                        variant="ghost"
                                                        size="small"
                                                        onClick={() => handleCopyUrlClick(album.publicToken!)}
                                                        disabled={isLoading}
                                                        className={styles.shareButton}
                                                    >
                                                        <i className="bi bi-link-45deg"></i>
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={`Unshare "${album.name}"`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="small"
                                                        onClick={() => handleUnshareClick(album.token)}
                                                        disabled={isLoading}
                                                        className={styles.unshareButton}
                                                    >
                                                        <i className="bi bi-share-fill"></i>
                                                    </Button>
                                                </Tooltip>
                                            </>
                                        ) : (
                                            <Tooltip content={`Share "${album.name}"`}>
                                                <Button
                                                    variant="ghost"
                                                    size="small"
                                                    onClick={() => handleShareClick(album.token)}
                                                    disabled={isLoading}
                                                    className={styles.shareButton}
                                                >
                                                    <i className="bi bi-share"></i>
                                                </Button>
                                            </Tooltip>
                                        )}
                                        <Tooltip content={`Delete "${album.name}"`}>
                                            <Button
                                                variant="ghost"
                                                size="small"
                                                onClick={() => handleDeleteClick(album.token, album.name)}
                                                disabled={isLoading}
                                                className={styles.deleteButton}
                                            >
                                                <i className="bi bi-x"></i>
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {isCreating && (
                        <div className={styles.createForm}>
                            <form onSubmit={handleCreateSubmit}>
                                <Input
                                    type="text"
                                    value={newAlbumName}
                                    onChange={e => setNewAlbumName(e.target.value)}
                                    placeholder="Enter album name..."
                                    autoFocus
                                    maxLength={50}
                                />
                                <div className={styles.actionButtons}>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="small"
                                        disabled={!newAlbumName.trim() || isLoading}
                                        className={styles.createButton}
                                    >
                                        Create Album
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="small"
                                        onClick={() => {
                                            setIsCreating(false);
                                            setNewAlbumName("");
                                        }}
                                        className={styles.cancelButton}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {albums.length === 0 && !isCreating && (
                        <div className={styles.emptyState}>
                            <i className="bi bi-collection"></i>
                            <p>No albums</p>
                            <Button
                                variant="outline"
                                size="small"
                                onClick={() => setIsCreating(true)}
                                disabled={isLoading}
                                className={styles.createFirstButton}
                            >
                                <i className="bi bi-plus"></i> Create first
                            </Button>
                        </div>
                    )}
                </>
            )}

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
