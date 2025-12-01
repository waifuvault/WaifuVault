import type { AdminFileData } from "@/types/AdminTypes";

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

export async function getAllEntries(waifuVaultBackend: string): Promise<AdminFileData[]> {
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
