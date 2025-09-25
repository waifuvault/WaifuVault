"use client";

import { useState } from "react";
import { useAlbums, useErrorHandler } from "@/app/hooks";
import { Button, Card, CardBody, CardHeader, FileBrowser, Footer, Header, ParticleBackground } from "@/app/components";
import type { PublicAlbumData } from "@/app/utils";
import { FileWrapper } from "@/app/types";
import styles from "./page.module.scss";

interface PublicAlbumClientProps {
    albumData: PublicAlbumData | null;
    publicToken: string;
}

export default function PublicAlbumClient({ albumData, publicToken }: PublicAlbumClientProps) {
    const { handleError } = useErrorHandler();
    const { downloadPublicAlbum } = useAlbums();
    const [downloading, setDownloading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
    const [downloadingSelected, setDownloadingSelected] = useState(false);

    const handleDownloadSelectedFiles = async () => {
        if (!selectedFiles.length || !albumData) {
            return;
        }

        setDownloadingSelected(true);
        try {
            const blob = await downloadPublicAlbum(publicToken, selectedFiles);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `${albumData.name}-selected.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            handleError(error, { defaultMessage: "Failed to download selected files" });
        } finally {
            setDownloadingSelected(false);
        }
    };

    const handleDownloadAlbum = async () => {
        if (!albumData || albumData.albumTooBigToDownload) {
            return;
        }

        setDownloading(true);
        try {
            const blob = await downloadPublicAlbum(publicToken);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${albumData.name}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            handleError(error, { defaultMessage: "Failed to download album" });
        } finally {
            setDownloading(false);
        }
    };

    if (!albumData) {
        return (
            <div className={styles.container}>
                <ParticleBackground intensity="medium" />
                <main className={styles.pageMain}>
                    <div className={styles.containerInner}>
                        <Header />
                        <Card className={styles.errorCard}>
                            <CardBody>
                                <div className={styles.errorState}>
                                    <i className="bi bi-exclamation-triangle"></i>
                                    <h2>Album Not Found</h2>
                                    <p>
                                        The album you&apos;re looking for doesn&apos;t exist or has been made private.
                                    </p>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <ParticleBackground intensity="medium" />
            <main className={styles.pageMain}>
                <div className={styles.containerInner}>
                    <Header />
                    <Card className={styles.albumCard}>
                        <CardHeader>
                            <div className={styles.albumHeader}>
                                <div className={styles.albumTitleSection}>
                                    <h1 className={styles.albumTitle}>{albumData.name}</h1>
                                    <span className={styles.fileCountBadge}>
                                        <i className="bi bi-files"></i>
                                        {`${albumData.files.length} file${albumData.files.length !== 1 ? "s" : ""}`}
                                    </span>
                                </div>
                                <div className={styles.albumControls}>
                                    {selectedFiles.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="medium"
                                            onClick={handleDownloadSelectedFiles}
                                            disabled={downloadingSelected}
                                        >
                                            {downloadingSelected ? (
                                                <>
                                                    <i className="bi bi-arrow-clockwise spin"></i> Downloading...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-download"></i> Download Selected (
                                                    {selectedFiles.length})
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        variant="primary"
                                        size="medium"
                                        onClick={handleDownloadAlbum}
                                        disabled={albumData.albumTooBigToDownload || downloading}
                                    >
                                        {downloading ? (
                                            <>
                                                <i className="bi bi-arrow-clockwise spin"></i> Generating zip...
                                            </>
                                        ) : albumData.albumTooBigToDownload ? (
                                            "Album too large to download"
                                        ) : (
                                            <>
                                                <i className="bi bi-download"></i> Download Album
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <FileBrowser
                                files={FileWrapper.wrapFiles(albumData.files)}
                                mode="public"
                                showSearch={true}
                                showSort={true}
                                showViewToggle={true}
                                allowSelection={true}
                                allowDeletion={false}
                                allowReorder={false}
                                allowRemoveFromAlbum={false}
                                showPagination={true}
                                itemsPerPage={20}
                                publicToken={publicToken}
                                onFilesSelected={setSelectedFiles}
                            />
                        </CardBody>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}
