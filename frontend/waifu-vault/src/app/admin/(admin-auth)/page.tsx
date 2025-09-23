"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin, useAdminAuth, useErrorHandler } from "@/app/hooks";
import type { BlockedIp } from "@/app/hooks/useAdmin";
import { useLoading } from "@/app/contexts";
import {
    BlockedIpsTable,
    Button,
    Card,
    CardBody,
    CardHeader,
    Dialog,
    FileBrowser,
    Footer,
    Header,
    ParticleBackground,
} from "@/app/components";
import { useToast } from "@/app/components/Toast";
import type { AdminFileData } from "@/app/types";
import { FileWrapper } from "@/app/types";
import styles from "./page.module.scss";

function AdminPageContent() {
    const { isAuthenticated, logout } = useAdminAuth();
    const { withLoading } = useLoading();
    const { getAllEntries, deleteFiles, getBlockedIps, unblockIps, blockIp } = useAdmin();
    const { handleError } = useErrorHandler();
    const { showToast } = useToast();

    const [adminFiles, setAdminFiles] = useState<AdminFileData[]>([]);
    const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
    const [banIpDialogOpen, setBanIpDialogOpen] = useState(false);
    const [selectedIpsToBan, setSelectedIpsToBan] = useState<string[]>([]);
    const [deleteAssociatedFiles, setDeleteAssociatedFiles] = useState(false);
    const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);

    const fetchAdminData = useCallback(async () => {
        await withLoading(async () => {
            try {
                const [files, ips] = await Promise.all([getAllEntries(), getBlockedIps()]);
                setAdminFiles(files);
                setBlockedIps(ips);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to load admin data" });
            }
        });
    }, [getAllEntries, getBlockedIps, withLoading, handleError]);

    const handleDeleteFiles = useCallback(
        async (fileIds: number[]) => {
            await withLoading(async () => {
                try {
                    await deleteFiles(fileIds);
                    await fetchAdminData();
                    showToast("success", `Deleted ${fileIds.length} file${fileIds.length > 1 ? "s" : ""}`);
                } catch (error) {
                    handleError(error, { defaultMessage: "Failed to delete files" });
                }
            });
        },
        [deleteFiles, fetchAdminData, withLoading, handleError, showToast],
    );

    const handleUnblockIps = useCallback(
        async (ips: string[]) => {
            await withLoading(async () => {
                try {
                    await unblockIps(ips);
                    await fetchAdminData();
                    showToast("success", `Unblocked ${ips.length} IP${ips.length > 1 ? "s" : ""}`);
                } catch (error) {
                    handleError(error, { defaultMessage: "Failed to unblock IPs" });
                }
            });
        },
        [unblockIps, fetchAdminData, withLoading, handleError, showToast],
    );

    const handleBanIpClick = useCallback((ip: string) => {
        setSelectedIpsToBan([ip]);
        setDeleteAssociatedFiles(false);
        setBanIpDialogOpen(true);
    }, []);

    const handleBanSelectedIps = useCallback(() => {
        const uniqueIps = [
            ...new Set(
                selectedFileIds
                    .map(id => adminFiles.find(f => f.id === id)?.ip)
                    .filter((ip): ip is string => ip !== null && ip !== undefined),
            ),
        ];

        if (uniqueIps.length === 0) {
            showToast("error", "No valid IPs found in selected files");
            return;
        }

        setSelectedIpsToBan(uniqueIps);
        setDeleteAssociatedFiles(false);
        setBanIpDialogOpen(true);
    }, [selectedFileIds, adminFiles, showToast]);

    const handleBanIpConfirm = useCallback(async () => {
        if (selectedIpsToBan.length === 0) {
            return;
        }

        await withLoading(async () => {
            try {
                for (const ip of selectedIpsToBan) {
                    await blockIp(ip, deleteAssociatedFiles);
                }
                await fetchAdminData();
                showToast(
                    "success",
                    `Banned ${selectedIpsToBan.length} IP${selectedIpsToBan.length > 1 ? "s" : ""} ${deleteAssociatedFiles ? "and deleted associated files" : ""}`,
                );
                setBanIpDialogOpen(false);
                setSelectedIpsToBan([]);
                setDeleteAssociatedFiles(false);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to ban IPs" });
            }
        });
    }, [selectedIpsToBan, deleteAssociatedFiles, blockIp, fetchAdminData, withLoading, handleError, showToast]);

    const mappedFiles = useMemo(() => {
        return adminFiles.map(file => ({
            id: file.id,
            fileName: file.fileName ?? "",
            fileExtension: file.fileExtension,
            originalFileName: file.originalFileName ?? "",
            fileSize: file.fileSize,
            createdAt: file.createdAt,
            expires: file.expires,
            url: file.url,
            ip: file.ip,
            ipBanned: file.ipBanned,
            oneTimeDownload: file.oneTimeDownload,
            mediaType: file.mediaType,
            bucket: file.bucket,
            token: file.fileToken,
            views: file.views,
            parsedFilename: file.originalFileName ?? "",
            expiresString: file.expires ?? null,
            albumToken: file.album?.token ?? null,
        }));
    }, [adminFiles]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchAdminData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    if (isAuthenticated !== true) {
        return null;
    }

    return (
        <div className={styles.container}>
            <ParticleBackground intensity="medium" />
            <main className={styles.pageMain}>
                <div className={styles.containerInner}>
                    <Header />
                    <Card className={styles.adminCard}>
                        <CardHeader>
                            <div className={styles.headerContent}>
                                <h1>Admin Dashboard</h1>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <div className={styles.fileBrowserWrapper}>
                                <FileBrowser
                                    files={FileWrapper.wrapFiles(mappedFiles)}
                                    onDeleteFiles={handleDeleteFiles}
                                    onLogout={logout}
                                    onBanIp={handleBanIpClick}
                                    onBanSelectedIps={handleBanSelectedIps}
                                    onFilesSelected={setSelectedFileIds}
                                    showSearch={true}
                                    showSort={true}
                                    showViewToggle={true}
                                    allowSelection={true}
                                    allowDeletion={true}
                                    allowReorder={false}
                                    allowRemoveFromAlbum={false}
                                    albums={[]}
                                    mode="admin"
                                />
                            </div>
                        </CardBody>
                    </Card>

                    <Card className={styles.adminCard}>
                        <CardHeader>
                            <div className={styles.headerContent}>
                                <h2>Blocked IPs</h2>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <BlockedIpsTable blockedIps={blockedIps} onUnblock={handleUnblockIps} />
                        </CardBody>
                    </Card>
                </div>
            </main>
            <Footer />

            <Dialog
                isOpen={banIpDialogOpen}
                onClose={() => {
                    setBanIpDialogOpen(false);
                    setSelectedIpToBan(null);
                    setDeleteAssociatedFiles(false);
                }}
                title="Ban IP Address"
                size="medium"
            >
                <div className={styles.dialogContent}>
                    <p>
                        Are you sure you want to ban{" "}
                        {selectedIpsToBan.length > 1 ? "these IP addresses" : "this IP address"}?
                    </p>
                    {selectedIpsToBan.map(ip => (
                        <p key={ip} className={styles.ipAddress}>
                            {ip}
                        </p>
                    ))}

                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={deleteAssociatedFiles}
                            onChange={e => setDeleteAssociatedFiles(e.target.checked)}
                        />
                        <span>Also delete all files associated with this IP</span>
                    </label>

                    <div className={styles.dialogActions}>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setBanIpDialogOpen(false);
                                setSelectedIpsToBan([]);
                                setDeleteAssociatedFiles(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleBanIpConfirm}>
                            Ban {selectedIpsToBan.length > 1 ? "IPs" : "IP"}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}

export default function AdminPage() {
    return <AdminPageContent />;
}
