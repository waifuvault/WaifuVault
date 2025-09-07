import type { AdminBucketDto } from "@/types/AdminTypes";

export async function getBucketData(backendRestBaseUrl: string): Promise<AdminBucketDto> {
    const response = await fetch(`${backendRestBaseUrl}/admin/bucket/`, {
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to fetch bucket data" }));
        throw new Error(error.message || "Failed to fetch bucket data");
    }

    return response.json();
}

export async function deleteFiles(backendRestBaseUrl: string, fileIds: number[]): Promise<void> {
    const response = await fetch(`${backendRestBaseUrl}/admin/bucket/deleteEntries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileIds),
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete files" }));
        throw new Error(error.message || "Failed to delete files");
    }
}