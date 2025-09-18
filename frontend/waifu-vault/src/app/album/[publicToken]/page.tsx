"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import { useAlbums } from "../../hooks/useAlbums";
import { FileBrowser, Footer, Header, ParticleBackground } from "@/app/components";
import Button from "../../components/Button/Button";
import Card, { CardBody, CardHeader } from "../../components/Card/Card";
import type { PublicAlbumData } from "../../utils/api/albumApi";
import { FileWrapper } from "../../types/FileWrapper";
import styles from "./page.module.scss";

export default function PublicAlbumPage() {
    const params = useParams();
    const publicToken = params.publicToken as string;
    const { handleError } = useErrorHandler();
    const { getPublicAlbum, downloadPublicAlbum } = useAlbums();
    const [albumData, setAlbumData] = useState<PublicAlbumData | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
    const [downloadingSelected, setDownloadingSelected] = useState(false);

    useEffect(() => {
        const fetchAlbumData = async () => {
            try {
                const data = await getPublicAlbum(publicToken);
                setAlbumData(data);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to load album" });
            } finally {
                setLoading(false);
            }
        };

        if (publicToken) {
            void fetchAlbumData();
        }
    }, [publicToken, getPublicAlbum, handleError]);

    const handleDownloadSelectedFiles = async () => {
        if (!selectedFiles.length || !albumData) {
            return;
        }

        setDownloadingSelected(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_REST_BASE_URL}/album/download/${publicToken}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(selectedFiles),
                },
            );

            if (!response.ok) {
                throw new Error("Failed to download selected files");
            }

            const blob = await response.blob();
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
        if (!albumData || albumData.downloadTooBig) {
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

    if (loading) {
        return (
            <div className={styles.container}>
                <ParticleBackground intensity="medium" />
                <main className={styles.pageMain}>
                    <div className={styles.containerInner}>
                        <Header />
                        <Card className={styles.loadingCard}>
                            <CardBody>
                                <div className={styles.loadingState}>
                                    <div className={styles.spinner}></div>
                                    <p>Loading album...</p>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

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
                                <h1 className={styles.albumTitle}>{albumData.name}</h1>
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
                                        disabled={albumData.downloadTooBig || downloading}
                                    >
                                        {downloading ? (
                                            <>
                                                <i className="bi bi-arrow-clockwise spin"></i> Downloading...
                                            </>
                                        ) : albumData.downloadTooBig ? (
                                            "Album too large to download"
                                        ) : (
                                            <>
                                                <i className="bi bi-download"></i> Download Album
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className={styles.albumInfo}>
                                <span className={styles.fileCount}>
                                    {albumData.files.length} file{albumData.files.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <FileBrowser
                                files={FileWrapper.wrapFiles(albumData.files)}
                                mode="admin"
                                showSearch={true}
                                showSort={true}
                                showViewToggle={true}
                                allowSelection={true}
                                allowDeletion={false}
                                allowRename={false}
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
