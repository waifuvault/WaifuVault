"use client";

import React, { useEffect, useState } from "react";
import styles from "./AlbumSidebar.module.scss";
import Button from "../Button/Button";
import { ALBUM_SIDEBAR_COLLAPSED_KEY, LocalStorage } from "@/constants/localStorageKeys";
import type { AlbumInfo } from "@/types/AdminTypes";

interface AlbumSidebarProps {
    albums: AlbumInfo[];
    selectedAlbum: string | null;
    onAlbumSelect: (albumToken: string | null) => void;
    onCreateAlbum: (name: string) => Promise<void>;
    onDeleteClick: (albumToken: string, albumName: string) => void;
    onFilesDropped?: (albumToken: string, fileTokens: string[]) => Promise<void>;
    isLoading?: boolean;
}

export function AlbumSidebar({
    albums,
    selectedAlbum,
    onAlbumSelect,
    onCreateAlbum,
    onDeleteClick,
    onFilesDropped,
    isLoading = false,
}: AlbumSidebarProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(() => LocalStorage.getBoolean(ALBUM_SIDEBAR_COLLAPSED_KEY, false));
    const [dragOverAlbum, setDragOverAlbum] = useState<string | null>(null);

    useEffect(() => LocalStorage.setBoolean(ALBUM_SIDEBAR_COLLAPSED_KEY, isCollapsed), [isCollapsed]);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAlbumName.trim()) {
            return;
        }

        try {
            await onCreateAlbum(newAlbumName.trim());
            setNewAlbumName("");
            setIsCreating(false);
        } catch (error) {
            console.error("Failed to create album:", error);
        }
    };

    const handleDeleteClick = (albumToken: string, albumName: string) => {
        onDeleteClick(albumToken, albumName);
    };

    const handleDragOver = (e: React.DragEvent, albumToken: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverAlbum(albumToken);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverAlbum(null);
        }
    };

    const handleDrop = async (e: React.DragEvent, albumToken: string) => {
        e.preventDefault();
        setDragOverAlbum(null);

        try {
            const fileTokensData = e.dataTransfer.getData("application/json");
            if (fileTokensData && onFilesDropped) {
                const fileTokens = JSON.parse(fileTokensData);
                await onFilesDropped(albumToken, fileTokens);
            }
        } catch (error) {
            console.error("Failed to drop files on album:", error);
        }
    };

    const selectedCount = selectedAlbum
        ? albums.find(a => a.token === selectedAlbum)?.fileCount || 0
        : albums.reduce((sum, a) => sum + (a.fileCount || 0), 0);

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>
            <div className={styles.header}>
                <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand albums" : "Collapse albums"}
                    className={styles.toggleButton}
                >
                    <i className={`bi ${isCollapsed ? "bi-chevron-right" : "bi-chevron-left"}`}></i>
                </Button>

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
                                {albums.reduce((sum, a) => sum + (a.fileCount || 0), 0)}
                            </span>
                        </Button>

                        {albums.map(album => (
                            <div
                                key={album.token}
                                className={`${styles.albumItemContainer} ${dragOverAlbum === album.token ? styles.dragOver : ""}`}
                                onDragOver={e => handleDragOver(e, album.token)}
                                onDragLeave={handleDragLeave}
                                onDrop={e => handleDrop(e, album.token)}
                            >
                                <Button
                                    variant="ghost"
                                    size="small"
                                    onClick={() => onAlbumSelect(album.token)}
                                    disabled={isLoading}
                                    className={`${styles.albumItem} ${styles.nested} ${selectedAlbum === album.token ? styles.active : ""}`}
                                >
                                    <i className="bi bi-collection"></i>
                                    <span className={styles.albumName}>{album.name}</span>
                                    <span className={styles.count}>{album.fileCount || 0}</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="small"
                                    onClick={() => handleDeleteClick(album.token, album.name)}
                                    disabled={isLoading}
                                    title={`Delete "${album.name}"`}
                                    className={styles.deleteButton}
                                >
                                    <i className="bi bi-x"></i>
                                </Button>
                            </div>
                        ))}
                    </div>

                    {isCreating && (
                        <div className={styles.createForm}>
                            <form onSubmit={handleCreateSubmit}>
                                <input
                                    type="text"
                                    value={newAlbumName}
                                    onChange={e => setNewAlbumName(e.target.value)}
                                    placeholder="Enter album name..."
                                    className={styles.nameInput}
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
        </div>
    );
}
