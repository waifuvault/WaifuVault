export interface UrlFileMixin {
    id: number;
    fileName: string;
    fileExtension: string | null;
    originalFileName: string;
    fileSize: number;
    createdAt: Date;
    expires: string | null;
    url: string;
    ip: string | null;
    ipBanned: boolean;
    oneTimeDownload: boolean;
    mediaType: string | null;
    bucket: string | null;
    token: string;
    views: number;
    parsedFilename: string;
    expiresString: string | null;
    albumToken?: string | null;
}

export interface AlbumInfo {
    token: string;
    publicToken: string | null;
    name: string;
    bucket: string;
    dateCreated: number;
    fileCount?: number;
}

export interface AdminBucketDto {
    token: string;
    files: UrlFileMixin[];
    albums: AlbumInfo[];
}

export interface AdminFileData {
    id: number;
    addedToAlbumOrder: number;
    fileName: string;
    fileExtension: string | null;
    originalFileName: string;
    fileSize: number;
    createdAt: Date;
    expires: string | null;
    url: string;
    ip: string | null;
    ipBanned: boolean;
    oneTimeDownload: boolean;
    mediaType: string | null;
    bucket: string | null;
    fileToken: string;
    fileProtectionLevel: string;
    views: number;
    album: AlbumInfo | null;
}

export interface AdminData {
    draw: number;
    recordsTotal: number;
    recordsFiltered: number;
    data: AdminFileData[];
}
