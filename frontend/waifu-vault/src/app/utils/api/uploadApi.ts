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
                console.error(`Upload stalled for ${file.name}: No progress for ${timeSinceLastProgress}ms (${Math.round(timeSinceLastProgress / 1000)}s)`);
                console.error(`Last loaded: ${lastLoaded} bytes, XHR readyState: ${xhr.readyState}, status: ${xhr.status}`);
                cleanup();
                xhr.abort();
                reject(new Error(`Upload stalled - no progress for ${Math.round(timeSinceLastProgress / 1000)}s. Last progress at ${Math.round((lastLoaded / file.size) * 100)}%. Try uploading fewer files at once or check your network connection.`));
            } else if (timeSinceLastProgress > 30000) {
                console.warn(`Upload slow for ${file.name}: No progress for ${Math.round(timeSinceLastProgress / 1000)}s (will abort at ${STALL_TIMEOUT / 1000}s)`);
            }
        }, 10000);

        xhr.upload.onprogress = e => {
            if (e.lengthComputable) {
                const progress = Math.round((e.loaded * 100) / e.total);

                if (e.loaded > lastLoaded) {
                    lastProgressTime = Date.now();
                    lastLoaded = e.loaded;
                    console.log(`Upload progress for ${file.name}: ${progress}% (${e.loaded}/${e.total} bytes)`);
                }

                if (onProgress) {
                    onProgress(progress);
                }
            }
        };

        xhr.onreadystatechange = () => {
            console.log(`Upload readyState for ${file.name}:`, xhr.readyState, `status:`, xhr.status);
        };

        xhr.onload = () => {
            cleanup();
            console.log(`Upload completed for ${file.name}, status: ${xhr.status}`);
            try {
                const response = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(response);
                } else {
                    console.error(`Upload API Error (${xhr.status}):`, response);
                    reject(new Error(response.message || `Upload failed (${xhr.status})`));
                }
            } catch {
                console.error("Upload API Parse Error:", xhr.responseText);
                reject(new Error(`Invalid response from server (${xhr.status})`));
            }
        };

        xhr.onerror = (e) => {
            cleanup();
            console.error(`Network error during upload of ${file.name}:`, e);
            console.error(`XHR state at error - readyState: ${xhr.readyState}, status: ${xhr.status}`);
            reject(new Error(`Network error during upload. ReadyState: ${xhr.readyState}, Status: ${xhr.status}`));
        };

        xhr.ontimeout = () => {
            cleanup();
            console.error(`Upload timeout for ${file.name}`);
            reject(new Error("Upload timed out"));
        };

        xhr.onabort = () => {
            cleanup();
            console.error(`Upload aborted for ${file.name}`);
            reject(new Error("Upload was aborted"));
        };

        xhr.onloadstart = () => {
            console.log(`Upload started for ${file.name} to ${uploadUrl}`);
        };

        xhr.onloadend = () => {
            console.log(`Upload loadend event for ${file.name}, readyState: ${xhr.readyState}, status: ${xhr.status}`);
        };

        console.log(`Initiating upload for ${file.name} (${file.size} bytes) to ${uploadUrl}`);
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
