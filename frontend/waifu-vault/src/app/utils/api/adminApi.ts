import type { AdminData } from "@/types/AdminTypes";

export type AdminFileQuery = {
    draw: number;
    start: number;
    length: number;
    sortColumn: string;
    sortDirection: "asc" | "desc";
    search: string;
};

export type BucketFileCount = {
    token: string;
    fileCount: number;
};

export interface BlockedIp {
    id: number;
    ip: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserInfo {
    id: string;
    email: string;
}

export async function getPagedEntries(waifuVaultBackend: string, query: AdminFileQuery): Promise<AdminData> {
    const params = new URLSearchParams({
        draw: String(query.draw),
        start: String(query.start),
        length: String(query.length),
        "order[0][column]": "0",
        "order[0][dir]": query.sortDirection,
        "columns[0][data]": query.sortColumn,
        "search[value]": query.search,
    });

    const response = await fetch(`${waifuVaultBackend}/rest/admin/datatablesEntries?${params}`, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch admin entries: ${response.statusText}`);
    }

    return await response.json();
}

export async function getBucketFileCounts(waifuVaultBackend: string): Promise<BucketFileCount[]> {
    const response = await fetch(`${waifuVaultBackend}/rest/admin/bucketFileCounts`, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch buckets: ${response.statusText}`);
    }

    return await response.json();
}

export async function deleteFiles(waifuVaultBackend: string, fileIds: number[]): Promise<void> {
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
}

export async function getBlockedIps(waifuVaultBackend: string): Promise<BlockedIp[]> {
    const response = await fetch(`${waifuVaultBackend}/rest/admin/blockedIps`, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch blocked IPs: ${response.statusText}`);
    }

    return await response.json();
}

export async function unblockIps(waifuVaultBackend: string, ips: string[]): Promise<void> {
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
}

export async function blockIp(waifuVaultBackend: string, ip: string, deleteFiles: boolean): Promise<void> {
    const response = await fetch(`${waifuVaultBackend}/rest/admin/blockIp?removeRelatedData=${deleteFiles}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip }),
    });

    if (!response.ok) {
        throw new Error(`Failed to block IP: ${response.statusText}`);
    }
}

export async function setBucketType(waifuVaultBackend: string, token: string, bucketType: string): Promise<void> {
    const response = await fetch(`${waifuVaultBackend}/rest/admin/setBucketType`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, bucketType }),
    });

    if (!response.ok) {
        throw new Error(`Failed to set bucket type: ${response.statusText}`);
    }
}

export async function changeDetails(waifuVaultBackend: string, email: string, password: string): Promise<void> {
    const response = await fetch(`${waifuVaultBackend}/rest/auth/changeDetails`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        throw new Error(`Failed to change details: ${response.statusText}`);
    }
}

export async function getCurrentUser(waifuVaultBackend: string): Promise<UserInfo> {
    const response = await fetch(`${waifuVaultBackend}/rest/auth/current_user`, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`Failed to get current user: ${response.statusText}`);
    }

    return await response.json();
}
