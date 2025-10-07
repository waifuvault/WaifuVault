import React, { useMemo, useState } from "react";
import type { BlockedIp } from "@/app/utils/api/adminApi";
import styles from "./BlockedIpsTable.module.scss";

interface BlockedIpsTableProps {
    blockedIps: BlockedIp[];
    onUnblock: (ips: string[]) => Promise<void>;
}

export function BlockedIpsTable({ blockedIps, onUnblock }: BlockedIpsTableProps) {
    const [selectedIps, setSelectedIps] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    const filteredIps = useMemo(() => {
        if (!searchTerm) {
            return blockedIps;
        }
        return blockedIps.filter(ip => ip.ip.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [blockedIps, searchTerm]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIps(new Set(filteredIps.map(ip => ip.ip)));
        } else {
            setSelectedIps(new Set());
        }
    };

    const handleSelectIp = (ip: string, checked: boolean) => {
        const newSelected = new Set(selectedIps);
        if (checked) {
            newSelected.add(ip);
        } else {
            newSelected.delete(ip);
        }
        setSelectedIps(newSelected);
    };

    const handleUnblock = async () => {
        if (selectedIps.size === 0) {
            return;
        }
        await onUnblock(Array.from(selectedIps));
        setSelectedIps(new Set());
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleString();
    };

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <input
                    type="text"
                    placeholder="Search IP addresses..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
                <button onClick={handleUnblock} disabled={selectedIps.size === 0} className={styles.unblockButton}>
                    Unblock Selected ({selectedIps.size})
                </button>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={filteredIps.length > 0 && selectedIps.size === filteredIps.length}
                                    onChange={e => handleSelectAll(e.target.checked)}
                                />
                            </th>
                            <th>ID</th>
                            <th>IP Address</th>
                            <th>Blocked On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredIps.length === 0 ? (
                            <tr>
                                <td colSpan={4} className={styles.emptyState}>
                                    {searchTerm ? "No matching IPs found" : "No blocked IPs"}
                                </td>
                            </tr>
                        ) : (
                            filteredIps.map(ip => (
                                <tr key={ip.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIps.has(ip.ip)}
                                            onChange={e => handleSelectIp(ip.ip, e.target.checked)}
                                        />
                                    </td>
                                    <td>{ip.id}</td>
                                    <td className={styles.ipAddress}>{ip.ip}</td>
                                    <td>{formatDate(ip.createdAt)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
