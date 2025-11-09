export interface UploadResponse {
    token: string;
    url: string;
    [key: string]: unknown;
}

export interface UploadOptions {
    expires?: string;
    password?: string;
    hideFilename?: boolean;
    oneTimeDownload?: boolean;
}

export async function uploadFile(
    backendRestBaseUrl: string,
    file: File,
    options: UploadOptions = {},
    bucketToken?: string,
    onProgress?: (progress: number) => void,
): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);

        if (options.password) {
            formData.append("password", options.password);
        }

        let params = `hide_filename=${options.hideFilename || false}&one_time_download=${options.oneTimeDownload || false}`;
        if (options.expires) {
            params += `&expires=${options.expires}`;
        }

        let uploadUrl = `${backendRestBaseUrl}`;
        if (bucketToken) {
            uploadUrl += `/${bucketToken}?${params}`;
        } else {
            uploadUrl += `?${params}`;
        }

        const xhr = new XMLHttpRequest();

        xhr.timeout = 0;

        let lastProgressTime = Date.now();
        let lastLoaded = 0;
        let stallCheckInterval: NodeJS.Timeout | null = null;
        const STALL_TIMEOUT = 120000;

        const cleanup = () => {
            if (stallCheckInterval) {
                clearInterval(stallCheckInterval);
                stallCheckInterval = null;
            }
        };

        stallCheckInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastProgress = now - lastProgressTime;

            if (timeSinceLastProgress > STALL_TIMEOUT) {
                cleanup();
                xhr.abort();
                reject(
                    new Error(
                        `Upload stalled - no progress for ${Math.round(timeSinceLastProgress / 1000)}s. Last progress at ${Math.round((lastLoaded / file.size) * 100)}%. Try uploading fewer files at once or check your network connection.`,
                    ),
                );
            }
        }, 10000);

        xhr.upload.onprogress = e => {
            if (e.lengthComputable) {
                const progress = Math.round((e.loaded * 100) / e.total);

                if (e.loaded > lastLoaded) {
                    lastProgressTime = Date.now();
                    lastLoaded = e.loaded;
                }

                if (onProgress) {
                    onProgress(progress);
                }
            }
        };

        xhr.onload = () => {
            cleanup();
            try {
                const response = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(response);
                } else {
                    reject(new Error(response.message || `Upload failed (${xhr.status})`));
                }
            } catch {
                reject(new Error(`Invalid response from server (${xhr.status})`));
            }
        };

        xhr.onerror = () => {
            cleanup();
            reject(new Error(`Network error during upload`));
        };

        xhr.ontimeout = () => {
            cleanup();
            reject(new Error("Upload timed out"));
        };

        xhr.onabort = () => {
            cleanup();
            reject(new Error("Upload was aborted"));
        };

        xhr.open("PUT", uploadUrl);
        xhr.send(formData);
    });
}

export async function associateFilesToAlbum(
    backendRestBaseUrl: string,
    albumToken: string,
    fileTokens: string[],
): Promise<void> {
    const response = await fetch(`${backendRestBaseUrl}/album/${albumToken}/associate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileTokens }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to associate files to album" }));
        throw new Error(error.message || "Failed to associate files to album");
    }
}
