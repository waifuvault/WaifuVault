import type { AdminFileData, UrlFileMixin } from "@/types/AdminTypes";
import type { WaifuPublicFile } from "@/app/utils/api/albumApi";

export type WrappableFile = AdminFileData | UrlFileMixin | WaifuPublicFile | File;

/**
 * Unified wrapper class for all file types used in the application.
 */
export class FileWrapper {
    private readonly _file: WrappableFile;

    constructor(file: WrappableFile) {
        this._file = file;
    }

    /**
     * Get the original file object
     */
    get raw(): WrappableFile {
        return this._file;
    }

    /**
     * Get the file ID
     */
    get id(): number {
        if (this._file instanceof File) {
            throw new Error("File objects don't have IDs");
        }
        return this._file.id;
    }

    /**
     * Get the file name
     */
    get fileName(): string {
        if (this._file instanceof File) {
            return this._file.name;
        }
        if ("originalFileName" in this._file) {
            return this._file.originalFileName;
        }
        if ("name" in this._file) {
            return this._file.name;
        }
        return (this._file as UrlFileMixin).parsedFilename;
    }

    /**
     * Get the file size in bytes
     */
    get fileSize(): number {
        if (this._file instanceof File) {
            return this._file.size;
        }
        if ("fileSize" in this._file) {
            return this._file.fileSize;
        }
        return this._file.size;
    }

    /**
     * Get the file's creation date
     */
    get createdAt(): Date | string {
        if (this._file instanceof File) {
            return new Date(this._file.lastModified);
        }
        if ("createdAt" in this._file) {
            return this._file.createdAt;
        }
        // WaifuPublicFile doesn't have createdAt, use current date as fallback
        return new Date();
    }

    /**
     * Get the file extension
     */
    get fileExtension(): string {
        if ("fileExtension" in this._file) {
            return this._file.fileExtension || "";
        }
        // Extract extension from filename
        return this.fileName.split(".").pop() || "";
    }

    /**
     * Get the media type/MIME type
     */
    get mediaType(): string | null {
        if (this._file instanceof File) {
            return this._file.type;
        }
        if ("mediaType" in this._file) {
            return this._file.mediaType;
        }
        if ("metadata" in this._file && this._file.metadata?.mediaType) {
            return this._file.metadata.mediaType;
        }
        return null;
    }

    /**
     * Get the file URL
     */
    get url(): string {
        if (this._file instanceof File) {
            return URL.createObjectURL(this._file);
        }
        return this._file.url ?? "";
    }

    /**
     * Get the file token (for admin/URL files)
     */
    get fileToken(): string | null {
        if (this._file instanceof File || "metadata" in this._file) {
            return null;
        }
        if ("fileToken" in this._file) {
            return this._file.fileToken;
        }
        if ("token" in this._file) {
            return this._file.token;
        }
        return null;
    }

    /**
     * Get the album name if available
     */
    get albumName(): string | null {
        if (this._file instanceof File || "metadata" in this._file) {
            return null;
        }
        if ("__album__" in this._file && this._file.__album__) {
            return this._file.__album__.name;
        }
        return null;
    }

    /**
     * Get the album token if available
     */
    get albumToken(): string | null {
        if (this._file instanceof File || "metadata" in this._file) {
            return null;
        }
        if ("albumToken" in this._file) {
            return this._file.albumToken || null;
        }
        return null;
    }

    /**
     * Get expiration date if available
     */
    get expires(): Date | number | string | null {
        if (this._file instanceof File || "metadata" in this._file) {
            return null;
        }
        if ("expires" in this._file) {
            return this._file.expires;
        }
        return null;
    }

    /**
     * Get thumbnail URL if available
     */
    get thumbnail(): string | null {
        if ("metadata" in this._file && this._file.metadata?.thumbnail) {
            return this._file.metadata.thumbnail;
        }
        return null;
    }

    /**
     * Get the appropriate file URL for previews/thumbnails
     */
    getFileUrl(fileType: string, publicToken?: string): string | null {
        if (this.isClientFile) {
            return null;
        }

        const token = this.fileToken;
        if (!token) {
            return this.thumbnail;
        }

        if (fileType === "image" || fileType === "video") {
            if ("metadata" in this._file) {
                const albumToken = publicToken ?? this.publicToken;
                if (albumToken) {
                    return `/operations/${albumToken}/thumbnail?imageId=${this.id}`;
                }
            }

            return `${process.env.NEXT_PUBLIC_THUMBNAIL_SERVICE}/api/v1/generateThumbnail/${token}?animate=true`;
        }

        return this.thumbnail;
    }

    /**
     * Get the album's public token if available
     */
    get publicToken(): string | null {
        if (this._file instanceof File || "metadata" in this._file) {
            return null;
        }
        if ("__album__" in this._file && this._file.__album__?.publicToken) {
            return this._file.__album__.publicToken;
        }
        if ("publicToken" in this._file && typeof this._file.publicToken === "string") {
            return this._file.publicToken;
        }
        return null;
    }

    /**
     * Check if file is a video
     */
    get isVideo(): boolean {
        if ("metadata" in this._file && typeof this._file.metadata?.isVideo === "boolean") {
            return this._file.metadata.isVideo;
        }
        const mediaType = this.mediaType?.toLowerCase() || "";
        return mediaType.startsWith("video/");
    }

    /**
     * Check if file is password protected
     */
    get isProtected(): boolean {
        if (this._file instanceof File) {
            return false;
        }

        if ("protected" in this._file) {
            return this._file.protected;
        }

        if ("fileProtectionLevel" in this._file) {
            return this._file.fileProtectionLevel === "Password" || this._file.fileProtectionLevel === "Encrypted";
        }

        return false;
    }

    /**
     * Get album order if available
     */
    get addedToAlbumOrder(): number | null {
        if ("addedToAlbumOrder" in this._file) {
            return this._file.addedToAlbumOrder ?? null;
        }
        return null;
    }

    /**
     * Get the IP address if available (admin files only)
     */
    get ip(): string | null {
        if (this._file instanceof File || "metadata" in this._file) {
            return null;
        }
        if ("ip" in this._file) {
            return this._file.ip;
        }
        return null;
    }

    /**
     * Check if this is a client-side File object
     */
    get isClientFile(): boolean {
        return this._file instanceof File;
    }

    /**
     * Get file name for rename operations (might be different from display name)
     */
    get renameableName(): string {
        if ("fileName" in this._file && this._file.fileName) {
            return this._file.fileName;
        }
        return this.fileName;
    }

    /**
     * Create an array of FileWrapper instances from various file arrays
     */
    static wrapFiles(files: WrappableFile[]): FileWrapper[] {
        return files.map(file => new FileWrapper(file));
    }

    /**
     * Helper method to find albums associated with a file
     */
    getAlbumName(albums?: { token: string; name: string }[]): string | null {
        if (this.albumName) {
            return this.albumName;
        }

        if (this.albumToken && albums) {
            const album = albums.find(a => a.token === this.albumToken);
            return album ? album.name : null;
        }

        return null;
    }
}
