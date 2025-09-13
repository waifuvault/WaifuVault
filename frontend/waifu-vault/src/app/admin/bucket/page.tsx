"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useBucketAuth } from "@/app/hooks/useBucketAuth";
import { useEnvironment } from "@/app/hooks/useEnvironment";
import { useLoading } from "@/app/contexts/LoadingContext";
import { useAlbums } from "@/app/hooks/useAlbums";
import { useBucket } from "@/app/hooks/useBucket";
import { useErrorHandler } from "@/app/hooks/useErrorHandler";
import { Card, CardBody, CardHeader, FileBrowser, Footer, Header, ParticleBackground } from "@/app/components";
import { AlbumSidebar } from "@/app/components/AlbumSidebar/AlbumSidebar";
import { FileUploadModal } from "@/app/components/FileUploadModal/FileUploadModal";
import { useToast } from "@/app/components/Toast";
import { UploadFile } from "@/app/types/upload";
import Dialog from "@/app/components/Dialog/Dialog";
import Button from "@/app/components/Button/Button";
import { useTheme } from "@/app/contexts/ThemeContext";
import { LocalStorage, SELECTED_ALBUM_KEY } from "@/constants/localStorageKeys";
import styles from "./page.module.scss";
import type { AdminBucketDto, UrlFileMixin } from "@/types/AdminTypes";

function BucketAdminContent() {
    const { isAuthenticated, logout } = useBucketAuth();
    const { waifuVaultBackend } = useEnvironment();
    const { withLoading } = useLoading();
    const {
        createAlbum,
        deleteAlbum,
        reorderFiles,
        assignFilesToAlbum,
        removeFilesFromAlbum,
        shareAlbum,
        unshareAlbum,
    } = useAlbums();
    const { getBucketData, deleteFiles } = useBucket();
    const { getThemeClass } = useTheme();
    const { showToast } = useToast();
    const { handleError } = useErrorHandler();

    const [bucketData, setBucketData] = useState<AdminBucketDto | null>(null);
    const [selectedAlbum, setSelectedAlbum] = useState<string | null>(
        () => LocalStorage.getString(SELECTED_ALBUM_KEY) || null,
    );
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        albumToken: string;
        albumName: string;
    }>({
        isOpen: false,
        albumToken: "",
        albumName: "",
    });
    const [isDraggingToAlbum, setIsDraggingToAlbum] = useState(false);
    const [uploadModal, setUploadModal] = useState<{
        isOpen: boolean;
        albumToken?: string;
        albumName?: string;
    }>({
        isOpen: false,
    });

    const handleAlbumSelect = useCallback((albumToken: string | null) => {
        setSelectedAlbum(albumToken);
        if (albumToken === null) {
            LocalStorage.remove(SELECTED_ALBUM_KEY);
        } else {
            LocalStorage.setString(SELECTED_ALBUM_KEY, albumToken);
        }
    }, []);

    const fetchBucketData = useCallback(async () => {
        await withLoading(async () => {
            try {
                const data = await getBucketData();
                setBucketData(data);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to load bucket data" });
            }
        });
    }, [getBucketData]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDeleteFiles = useCallback(
        async (fileIds: number[]) => {
            await withLoading(async () => {
                try {
                    await deleteFiles(fileIds);
                    await fetchBucketData();
                } catch (error) {
                    handleError(error, { defaultMessage: "Failed to delete files" });
                }
            });
        },
        [deleteFiles, fetchBucketData], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const handleCreateAlbum = useCallback(
        async (name: string) => {
            if (!bucketData?.token) {
                return;
            }

            await withLoading(async () => {
                try {
                    await createAlbum(bucketData.token, name);
                    await fetchBucketData();
                } catch (error) {
                    handleError(error, { defaultMessage: "Failed to create album" });
                }
            });
        },
        [bucketData?.token, createAlbum, fetchBucketData], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const handleDeleteClick = useCallback((albumToken: string, albumName: string) => {
        setDeleteDialog({
            isOpen: true,
            albumToken,
            albumName,
        });
    }, []);

    const handleDeleteConfirm = useCallback(
        async (deleteFiles: boolean) => {
            await withLoading(async () => {
                try {
                    await deleteAlbum(deleteDialog.albumToken, deleteFiles);
                    if (selectedAlbum === deleteDialog.albumToken) {
                        handleAlbumSelect(null);
                    }
                    await fetchBucketData();
                    setDeleteDialog({ isOpen: false, albumToken: "", albumName: "" });
                } catch (error) {
                    handleError(error, { defaultMessage: "Failed to delete album" });
                }
            });
        },
        [deleteAlbum, deleteDialog.albumToken, selectedAlbum, handleAlbumSelect, fetchBucketData], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const albumsWithCounts = useMemo(() => {
        if (!bucketData?.albums || !bucketData?.files) {
            return [];
        }

        return bucketData.albums.map(album => ({
            ...album,
            fileCount: bucketData.files.filter(file => file.albumToken === album.token).length,
        }));
    }, [bucketData?.albums, bucketData?.files]);

    const handleFilesDropped = useCallback(
        async (albumToken: string, fileTokens: string[]) => {
            await withLoading(async () => {
                try {
                    await assignFilesToAlbum(albumToken, fileTokens);
                    await fetchBucketData();

                    const album = albumsWithCounts.find(a => a.token === albumToken);
                    const albumName = album?.name || "Unknown Album";
                    const fileCount = fileTokens.length;

                    showToast(
                        "success",
                        `${fileCount} file${fileCount === 1 ? "" : "s"} associated with ${albumName}`,
                        "Files Associated",
                    );
                } catch (error) {
                    handleError(error, {
                        defaultMessage: "Failed to associate files with album",
                    });
                    throw error;
                }
            });
        },
        [assignFilesToAlbum, fetchBucketData, albumsWithCounts, showToast, isDraggingToAlbum], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const handleDragStart = useCallback((draggingToAlbum: boolean) => {
        setIsDraggingToAlbum(draggingToAlbum);
    }, []);

    const handleDragEnd = useCallback(() => {
        setIsDraggingToAlbum(false);
    }, []);

    const handleDeleteCancel = useCallback(() => {
        setDeleteDialog({ isOpen: false, albumToken: "", albumName: "" });
    }, []);

    const handleUploadClick = useCallback(
        (albumToken?: string) => {
            const album = albumToken ? albumsWithCounts.find(a => a.token === albumToken) : null;
            setUploadModal({
                isOpen: true,
                albumToken,
                albumName: album?.name,
            });
        },
        [albumsWithCounts],
    );

    const handleRemoveFromAlbum = useCallback(
        async (fileIds: number[]) => {
            if (!selectedAlbum || !bucketData?.files) {
                return;
            }

            await withLoading(async () => {
                try {
                    const filesToRemove = bucketData.files.filter(f => fileIds.includes(f.id));
                    const fileTokens = filesToRemove.map(f => f.token);

                    await removeFilesFromAlbum(selectedAlbum, fileTokens);
                    await fetchBucketData();

                    const albumName = albumsWithCounts.find(a => a.token === selectedAlbum)?.name || "Album";
                    showToast(
                        "success",
                        `Removed ${fileIds.length} file${fileIds.length > 1 ? "s" : ""} from ${albumName}`,
                    );
                } catch (error) {
                    handleError(error, {
                        defaultMessage: "Failed to remove files from album",
                    });
                }
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            selectedAlbum,
            bucketData?.files,
            removeFilesFromAlbum,
            fetchBucketData,
            albumsWithCounts,
            showToast,
            withLoading,
        ],
    );

    const handleUploadClose = useCallback(() => {
        setUploadModal({ isOpen: false });
    }, []);

    const handleUploadComplete = useCallback(
        async (files?: UploadFile[]) => {
            if (!files) {
                return;
            }
            await fetchBucketData();

            const successfulFiles = files.filter(f => f.status === "completed");
            const failedFiles = files.filter(f => f.status === "error");

            if (successfulFiles.length > 0) {
                showToast(
                    "success",
                    `${successfulFiles.length} file${successfulFiles.length > 1 ? "s" : ""} uploaded successfully`,
                );
            }

            if (failedFiles.length > 0) {
                showToast("error", `${failedFiles.length} file${failedFiles.length > 1 ? "s" : ""} failed to upload`);
            }
        },
        [fetchBucketData, showToast],
    );

    const handleShareAlbum = useCallback(
        async (albumToken: string) => {
            await withLoading(async () => {
                try {
                    await shareAlbum(albumToken);
                    await fetchBucketData();
                    showToast("success", "Album shared successfully");
                } catch (error) {
                    handleError(error, { defaultMessage: "Failed to share album" });
                }
            });
        },
        [shareAlbum, fetchBucketData, showToast], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const handleUnshareAlbum = useCallback(
        async (albumToken: string) => {
            await withLoading(async () => {
                try {
                    await unshareAlbum(albumToken);
                    await fetchBucketData();
                    showToast("success", "Album unshared successfully");
                } catch (error) {
                    handleError(error, { defaultMessage: "Failed to unshare album" });
                }
            });
        },
        [unshareAlbum, fetchBucketData, showToast], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const handleCopyPublicUrl = useCallback(
        (publicToken: string) => {
            const publicUrl = `${waifuVaultBackend}/album/${publicToken}`;
            navigator.clipboard
                .writeText(publicUrl)
                .then(() => {
                    showToast("success", "Public URL copied to clipboard");
                })
                .catch(() => {
                    showToast("error", "Failed to copy URL to clipboard");
                });
        },
        [waifuVaultBackend, showToast],
    );

    const handleReorderFiles = useCallback(
        async (fileId: number, oldPosition: number, newPosition: number, showSuccessToast: boolean = true) => {
            if (!selectedAlbum) {
                return;
            }

            try {
                await reorderFiles(selectedAlbum, fileId, oldPosition, newPosition);
                if (showSuccessToast) {
                    await fetchBucketData();
                    showToast("success", "File order updated successfully");
                }
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to reorder file" });
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedAlbum, reorderFiles, fetchBucketData, showToast],
    );

    const filteredFiles = useMemo((): UrlFileMixin[] => {
        if (!bucketData?.files) {
            return [];
        }

        if (selectedAlbum === null) {
            return bucketData.files;
        }

        return bucketData.files.filter(file => file.albumToken === selectedAlbum);
    }, [bucketData?.files, selectedAlbum]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchBucketData();
        }
    }, [isAuthenticated, fetchBucketData]);

    useEffect(() => {
        if (bucketData?.albums && selectedAlbum) {
            const albumExists = bucketData.albums.some(album => album.token === selectedAlbum);
            if (!albumExists) {
                handleAlbumSelect(null);
            }
        }
    }, [bucketData?.albums, selectedAlbum, handleAlbumSelect]);

    if (isAuthenticated !== true || !bucketData) {
        return null;
    }

    return (
        <div className={styles.container}>
            <ParticleBackground intensity="medium" />
            <main className={styles.pageMain}>
                <div className={styles.containerInner}>
                    <Header />
                    <Card className={styles.bucketCard}>
                        <CardHeader>
                            <div className={styles.headerContent}>
                                <div className={styles.titleSection}>
                                    <h1>Bucket Manager</h1>
                                    {bucketData && (
                                        <div className={styles.bucketToken}>
                                            <span className={styles.tokenLabel}>Token:</span>
                                            <span className={styles.tokenValue}>{bucketData.token}</span>
                                        </div>
                                    )}
                                </div>
                                {selectedAlbum && (
                                    <div className={styles.albumIndicator}>
                                        <i className="bi bi-collection"></i>
                                        <span>
                                            {albumsWithCounts.find(a => a.token === selectedAlbum)?.name ||
                                                "Unknown Album"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardBody>
                            <div className={styles.bucketContent}>
                                <AlbumSidebar
                                    albums={albumsWithCounts}
                                    selectedAlbum={selectedAlbum}
                                    onAlbumSelect={handleAlbumSelect}
                                    onCreateAlbum={handleCreateAlbum}
                                    onDeleteClick={handleDeleteClick}
                                    onFilesDropped={handleFilesDropped}
                                    onShareAlbum={handleShareAlbum}
                                    onUnshareAlbum={handleUnshareAlbum}
                                    onCopyPublicUrl={handleCopyPublicUrl}
                                    currentFilesCount={filteredFiles.length}
                                />
                                <div className={styles.fileBrowserWrapper}>
                                    <FileBrowser
                                        files={filteredFiles}
                                        albums={albumsWithCounts.map(a => ({ token: a.token, name: a.name }))}
                                        onDeleteFiles={handleDeleteFiles}
                                        onReorderFiles={handleReorderFiles}
                                        onRemoveFromAlbum={handleRemoveFromAlbum}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                        onLogout={logout}
                                        onUploadClick={handleUploadClick}
                                        showSearch={true}
                                        showSort={true}
                                        showViewToggle={true}
                                        allowSelection={true}
                                        allowDeletion={true}
                                        allowReorder={selectedAlbum !== null}
                                        allowRemoveFromAlbum={selectedAlbum !== null}
                                        albumToken={selectedAlbum || undefined}
                                        mode="bucket"
                                    />
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </main>
            <Footer />

            <Dialog
                isOpen={deleteDialog.isOpen}
                onClose={handleDeleteCancel}
                title="Delete Album"
                maxWidth="450px"
                className={getThemeClass() === "themeMinimal" ? styles.solidDialogLight : styles.solidDialog}
            >
                <div style={{ padding: "1rem 0" }}>
                    <p style={{ marginBottom: "1.5rem", fontSize: "0.95rem", lineHeight: "1.4" }}>
                        Are you sure you want to delete the album{" "}
                        <strong>&ldquo;{deleteDialog.albumName}&rdquo;</strong>?
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <Button variant="outline" onClick={() => handleDeleteConfirm(false)}>
                            <i className="bi bi-collection" style={{ marginRight: "0.5rem" }}></i>
                            Delete album, keep files
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => handleDeleteConfirm(true)}
                            className={styles.deleteFilesButton}
                        >
                            <i className="bi bi-trash" style={{ marginRight: "0.5rem" }}></i>
                            Delete album and all files
                        </Button>

                        <Button variant="secondary" onClick={handleDeleteCancel}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Dialog>

            <FileUploadModal
                isOpen={uploadModal.isOpen}
                onClose={handleUploadClose}
                bucketToken={bucketData?.token}
                albumToken={uploadModal.albumToken}
                albumName={uploadModal.albumName}
                onUploadComplete={handleUploadComplete}
            />
        </div>
    );
}

export default function BucketAdmin() {
    return <BucketAdminContent />;
}
