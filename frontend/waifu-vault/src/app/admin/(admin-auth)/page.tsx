"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdmin, useAdminAuth, useErrorHandler } from "@/app/hooks";
import type { BlockedIp, BucketFileCount } from "@/app/utils/api/adminApi";
import { useLoading } from "@/app/contexts";
import {
    BlockedIpsTable,
    Button,
    Card,
    CardBody,
    CardHeader,
    Dialog,
    FileBrowser,
    FileDetailsDialog,
    Footer,
    Header,
    Input,
    ParticleBackground,
} from "@/app/components";
import { useToast } from "@/app/components/Toast";
import type { FileBrowserQuery, SortField } from "@/app/components/FileBrowser/FileBrowser";
import type { AdminFileData } from "@/app/types";
import { FileWrapper } from "@/app/types";
import styles from "./page.module.scss";

const sortColumns: Record<SortField, string> = {
    name: "originalFileName",
    date: "createdAt",
    size: "fileSize",
    type: "fileExtension",
    layout: "addedToAlbumOrder",
};

function AdminPageContent() {
    const { isAuthenticated, logout, changeDetails, getCurrentUser } = useAdminAuth();
    const { withLoading } = useLoading();
    const { getPagedEntries, getBucketFileCounts, deleteFiles, getBlockedIps, unblockIps, blockIp, setBucketType } =
        useAdmin();
    const { handleError } = useErrorHandler();
    const { showToast } = useToast();

    const [adminFiles, setAdminFiles] = useState<AdminFileData[]>([]);
    const [totalFiles, setTotalFiles] = useState(0);
    const [bucketFileCounts, setBucketFileCounts] = useState<BucketFileCount[]>([]);
    const latestQuery = useRef<FileBrowserQuery | null>(null);
    const latestDraw = useRef(0);
    const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
    const [banIpDialogOpen, setBanIpDialogOpen] = useState(false);
    const [selectedIpsToBan, setSelectedIpsToBan] = useState<string[]>([]);
    const [deleteAssociatedFiles, setDeleteAssociatedFiles] = useState(false);
    const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedFileForDetails, setSelectedFileForDetails] = useState<FileWrapper | null>(null);
    const [upgradeBucketDialogOpen, setUpgradeBucketDialogOpen] = useState(false);
    const [selectedBucketToken, setSelectedBucketToken] = useState<string | null>(null);
    const [changeDetailsDialogOpen, setChangeDetailsDialogOpen] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const loadFiles = useCallback(
        async (query: FileBrowserQuery) => {
            latestQuery.current = query;
            latestDraw.current += 1;
            const draw = latestDraw.current;

            try {
                const result = await getPagedEntries({
                    draw,
                    start: (query.page - 1) * query.pageSize,
                    length: query.pageSize,
                    sortColumn: sortColumns[query.sortField],
                    sortDirection: query.sortOrder,
                    search: query.search.trim(),
                });

                if (draw !== latestDraw.current) {
                    return;
                }

                setAdminFiles(result.data);
                setTotalFiles(result.recordsFiltered);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to load files" });
            }
        },
        [getPagedEntries, handleError],
    );

    const fetchAdminData = useCallback(async () => {
        await withLoading(async () => {
            try {
                const ips = await getBlockedIps();
                setBlockedIps(ips);

                if (latestQuery.current) {
                    await loadFiles(latestQuery.current);
                }
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to load admin data" });
            }
        });
    }, [getBlockedIps, loadFiles, withLoading, handleError]);

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

    const handleShowDetails = useCallback((file: FileWrapper) => {
        setSelectedFileForDetails(file);
        setDetailsDialogOpen(true);
    }, []);

    const handleUpgradeBucketClick = useCallback(async () => {
        await withLoading(async () => {
            try {
                setBucketFileCounts(await getBucketFileCounts());
                setUpgradeBucketDialogOpen(true);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to load buckets" });
            }
        });
    }, [getBucketFileCounts, withLoading, handleError]);

    const handleUpgradeBucketConfirm = useCallback(async () => {
        if (!selectedBucketToken) {
            showToast("error", "Please select a bucket to upgrade");
            return;
        }

        await withLoading(async () => {
            try {
                await setBucketType(selectedBucketToken, "PREMIUM");
                await fetchAdminData();
                showToast("success", "Bucket upgraded to premium successfully");
                setUpgradeBucketDialogOpen(false);
                setSelectedBucketToken(null);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to upgrade bucket" });
            }
        });
    }, [selectedBucketToken, setBucketType, fetchAdminData, withLoading, handleError, showToast]);

    const handleUploadComplete = useCallback(async () => {
        await fetchAdminData();
        showToast("success", "Files uploaded successfully");
    }, [fetchAdminData, showToast]);

    const handleChangeDetailsClick = useCallback(async () => {
        await withLoading(async () => {
            try {
                const userInfo = await getCurrentUser();
                setNewEmail(userInfo.email);
                setNewPassword("");
                setChangeDetailsDialogOpen(true);
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to load user info" });
            }
        });
    }, [getCurrentUser, withLoading, handleError]);

    const handleChangeDetailsConfirm = useCallback(async () => {
        if (!newEmail || !newPassword) {
            showToast("error", "Please enter both email and password");
            return;
        }

        await withLoading(async () => {
            try {
                await changeDetails(newEmail, newPassword);
                showToast("success", "Details changed successfully");
                setChangeDetailsDialogOpen(false);
                setNewEmail("");
                setNewPassword("");
            } catch (error) {
                handleError(error, { defaultMessage: "Failed to change details" });
            }
        });
    }, [newEmail, newPassword, changeDetails, withLoading, handleError, showToast]);

    const mappedFiles = useMemo(() => {
        return adminFiles.map(file => ({
            id: file.id,
            addedToAlbumOrder: file.addedToAlbumOrder,
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
            fileToken: file.fileToken,
            fileProtectionLevel: file.fileProtectionLevel,
            views: file.views,
            album: file.album,
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
                                <div className={styles.headerButtons}>
                                    <Button variant="primary" size="small" onClick={handleChangeDetailsClick}>
                                        Change Email/Password
                                    </Button>
                                    <Button variant="primary" size="small" onClick={handleUpgradeBucketClick}>
                                        Upgrade Bucket
                                    </Button>
                                </div>
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
                                    onShowDetails={handleShowDetails}
                                    onFilesSelected={setSelectedFileIds}
                                    onUploadComplete={handleUploadComplete}
                                    showSearch={true}
                                    showSort={true}
                                    showViewToggle={true}
                                    allowSelection={true}
                                    allowDeletion={true}
                                    allowReorder={false}
                                    allowRemoveFromAlbum={false}
                                    allowUpload={true}
                                    albums={[]}
                                    mode="admin"
                                    totalFiles={totalFiles}
                                    onQueryChange={loadFiles}
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
                    setSelectedIpsToBan([]);
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

            <FileDetailsDialog
                isOpen={detailsDialogOpen}
                onClose={() => {
                    setDetailsDialogOpen(false);
                    setSelectedFileForDetails(null);
                }}
                file={selectedFileForDetails}
            />

            <Dialog
                isOpen={upgradeBucketDialogOpen}
                onClose={() => {
                    setUpgradeBucketDialogOpen(false);
                    setSelectedBucketToken(null);
                }}
                title="Upgrade Bucket to Premium"
                size="medium"
            >
                <div className={styles.dialogContent}>
                    <p>Select the bucket you want to set as premium:</p>

                    {bucketFileCounts.length === 0 ? (
                        <p>No buckets found</p>
                    ) : (
                        <div className={styles.bucketList}>
                            {bucketFileCounts.map(bucket => (
                                <label key={bucket.token} className={styles.bucketOption}>
                                    <input
                                        type="radio"
                                        name="bucketSelection"
                                        value={bucket.token}
                                        checked={selectedBucketToken === bucket.token}
                                        onChange={e => setSelectedBucketToken(e.target.value)}
                                    />
                                    <span>
                                        {bucket.token} ({bucket.fileCount} file{bucket.fileCount !== 1 ? "s" : ""})
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className={styles.dialogActions}>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setUpgradeBucketDialogOpen(false);
                                setSelectedBucketToken(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleUpgradeBucketConfirm} disabled={!selectedBucketToken}>
                            Upgrade
                        </Button>
                    </div>
                </div>
            </Dialog>

            <Dialog
                isOpen={changeDetailsDialogOpen}
                onClose={() => {
                    setChangeDetailsDialogOpen(false);
                    setNewEmail("");
                    setNewPassword("");
                }}
                title="Change Email/Password"
                size="medium"
            >
                <div className={styles.dialogContent}>
                    <p>Enter your email and new password. Both fields are required.</p>

                    <div className={styles.formField}>
                        <label htmlFor="newEmail">Email</label>
                        <Input
                            id="newEmail"
                            type="email"
                            placeholder="Enter email"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.formField}>
                        <label htmlFor="newPassword">New Password</label>
                        <Input
                            id="newPassword"
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.dialogActions}>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setChangeDetailsDialogOpen(false);
                                setNewEmail("");
                                setNewPassword("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleChangeDetailsConfirm}>
                            Save Changes
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
