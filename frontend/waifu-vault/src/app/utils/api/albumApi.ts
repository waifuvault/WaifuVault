import type { AlbumInfo, UrlFileMixin } from "@/types/AdminTypes";

export async function createAlbum(backendRestBaseUrl: string, bucketToken: string, name: string): Promise<AlbumInfo> {
    const response = await fetch(`${backendRestBaseUrl}/album/${bucketToken}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to create album" }));
        throw new Error(error.message || "Failed to create album");
    }

    return response.json();
}

export async function deleteAlbum(
    backendRestBaseUrl: string,
    albumToken: string,
    deleteFiles: boolean = false,
): Promise<void> {
    const response = await fetch(`${backendRestBaseUrl}/album/${albumToken}?deleteFiles=${deleteFiles}`, {
        method: "DELETE",
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete album" }));
        throw new Error(error.message || "Failed to delete album");
    }
}

export async function getAlbum(
    backendRestBaseUrl: string,
    albumToken: string,
): Promise<{ files: UrlFileMixin[]; album: AlbumInfo }> {
    const response = await fetch(`${backendRestBaseUrl}/album/${albumToken}`, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to get album" }));
        throw new Error(error.message || "Failed to get album");
    }

    const album = await response.json();
    return {
        album: {
            token: album.token,
            publicToken: album.publicToken,
            name: album.name,
            bucket: album.bucketToken,
            dateCreated: album.dateCreated,
            fileCount: album.files ? album.files.length : 0,
        },
        files: album.files || [],
    };
}

export async function assignFilesToAlbum(
    backendRestBaseUrl: string,
    albumToken: string,
    fileTokens: string[],
): Promise<void> {
    const response = await fetch(`${backendRestBaseUrl}/album/${albumToken}/associate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ fileTokens }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to assign files to album" }));
        throw new Error(error.message || "Failed to assign files to album");
    }
}

export async function removeFilesFromAlbum(
    backendRestBaseUrl: string,
    albumToken: string,
    fileTokens: string[],
): Promise<void> {
    const response = await fetch(`${backendRestBaseUrl}/album/${albumToken}/disassociate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ fileTokens }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to remove files from album" }));
        throw new Error(error.message || "Failed to remove files from album");
    }
}

export async function reorderFiles(
    backendRestBaseUrl: string,
    albumToken: string,
    fileId: number,
    oldPosition: number,
    newPosition: number,
): Promise<void> {
    const response = await fetch(
        `${backendRestBaseUrl}/album/${albumToken}/swapFileOrder/${fileId}/${oldPosition}/${newPosition}`,
        {
            method: "POST",
            credentials: "include",
        },
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to reorder files" }));
        throw new Error(error.message || "Failed to reorder files");
    }
}

export async function shareAlbum(backendRestBaseUrl: string, albumToken: string): Promise<string> {
    const response = await fetch(`${backendRestBaseUrl}/album/share/${albumToken}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to share album" }));
        throw new Error(error.message || "Failed to share album");
    }

    const result = await response.json();
    return result.description;
}

export async function unshareAlbum(backendRestBaseUrl: string, albumToken: string): Promise<boolean> {
    const response = await fetch(`${backendRestBaseUrl}/album/revoke/${albumToken}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to unshare album" }));
        throw new Error(error.message || "Failed to unshare album");
    }

    const result = await response.json();
    return result.success;
}
