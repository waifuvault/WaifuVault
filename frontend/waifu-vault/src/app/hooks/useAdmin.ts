import { useCallback } from "react";
import { useEnvironment } from "./useEnvironment";
import type { AdminFileData } from "@/types/AdminTypes";

export interface BlockedIp {
    id: number;
    ip: string;
    createdAt: Date;
    updatedAt: Date;
}

export function useAdmin() {
    const { waifuVaultBackend } = useEnvironment();

    const getAllEntries = useCallback(async (): Promise<AdminFileData[]> => {
        const response = await fetch(`${waifuVaultBackend}/rest/admin/allEntries`, {
            method: "GET",
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch admin entries: ${response.statusText}`);
        }

        const result = await response.json();
        if (Array.isArray(result)) {
            return result.flatMap(item => item.data ?? []);
        }
        return result.data ?? [];
    }, [waifuVaultBackend]);

    const deleteFiles = useCallback(
        async (fileIds: number[]): Promise<void> => {
            const response = await fetch(`${waifuVaultBackend}/rest/admin/deleteEntries`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(fileIds),
            });

            if (!response.ok) {
                throw new Error(`Failed to delete files: ${response.statusText}`);
            }
        },
        [waifuVaultBackend],
    );

    const getBlockedIps = useCallback(async (): Promise<BlockedIp[]> => {
        const response = await fetch(`${waifuVaultBackend}/rest/admin/blockedIps`, {
            method: "GET",
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch blocked IPs: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    }, [waifuVaultBackend]);

    const unblockIps = useCallback(
        async (ips: string[]): Promise<void> => {
            const response = await fetch(`${waifuVaultBackend}/rest/admin/unblockIps`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(ips),
            });

            if (!response.ok) {
                throw new Error(`Failed to unblock IPs: ${response.statusText}`);
            }
        },
        [waifuVaultBackend],
    );

    const blockIp = useCallback(
        async (ip: string, deleteFiles: boolean): Promise<void> => {
            const response = await fetch(`${waifuVaultBackend}/rest/admin/blockIp`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ip, deleteFiles }),
            });

            if (!response.ok) {
                throw new Error(`Failed to block IP: ${response.statusText}`);
            }
        },
        [waifuVaultBackend],
    );

    return {
        getAllEntries,
        deleteFiles,
        getBlockedIps,
        unblockIps,
        blockIp,
    };
}
