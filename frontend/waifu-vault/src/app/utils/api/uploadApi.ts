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

        xhr.upload.onprogress = e => {
            if (e.lengthComputable && onProgress) {
                const progress = Math.round((e.loaded * 100) / e.total);
                onProgress(progress);
            }
        };

        xhr.onload = () => {
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

        xhr.onerror = () => {
            reject(new Error("Network error during upload"));
        };

        xhr.ontimeout = () => {
            reject(new Error("Upload timed out"));
        };

        xhr.onabort = () => {
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
