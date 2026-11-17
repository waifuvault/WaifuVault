"use client";

import { useCallback } from "react";
import { useEnvironment } from "./useEnvironment";
import type { AdminData } from "@/types/AdminTypes";
import type { AdminFileQuery, BlockedIp, BucketFileCount } from "@/app/utils/api/adminApi";
import * as adminApi from "@/app/utils/api/adminApi";

export function useAdmin() {
    const { waifuVaultBackend } = useEnvironment();

    const getPagedEntries = useCallback(
        async (query: AdminFileQuery): Promise<AdminData> => {
            return adminApi.getPagedEntries(waifuVaultBackend, query);
        },
        [waifuVaultBackend],
    );

    const getBucketFileCounts = useCallback(async (): Promise<BucketFileCount[]> => {
        return adminApi.getBucketFileCounts(waifuVaultBackend);
    }, [waifuVaultBackend]);

    const deleteFiles = useCallback(
        async (fileIds: number[]): Promise<void> => {
            return adminApi.deleteFiles(waifuVaultBackend, fileIds);
        },
        [waifuVaultBackend],
    );

    const getBlockedIps = useCallback(async (): Promise<BlockedIp[]> => {
        return adminApi.getBlockedIps(waifuVaultBackend);
    }, [waifuVaultBackend]);

    const unblockIps = useCallback(
        async (ips: string[]): Promise<void> => {
            return adminApi.unblockIps(waifuVaultBackend, ips);
        },
        [waifuVaultBackend],
    );

    const blockIp = useCallback(
        async (ip: string, deleteFiles: boolean): Promise<void> => {
            return adminApi.blockIp(waifuVaultBackend, ip, deleteFiles);
        },
        [waifuVaultBackend],
    );

    const setBucketType = useCallback(
        async (token: string, bucketType: string): Promise<void> => {
            return adminApi.setBucketType(waifuVaultBackend, token, bucketType);
        },
        [waifuVaultBackend],
    );

    return {
        getPagedEntries,
        getBucketFileCounts,
        deleteFiles,
        getBlockedIps,
        unblockIps,
        blockIp,
        setBucketType,
    };
}
