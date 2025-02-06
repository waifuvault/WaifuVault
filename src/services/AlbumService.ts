import { constant, Constant, Inject, Service } from "@tsed/di";
import { AlbumRepo } from "../db/repo/AlbumRepo.js";
import { BucketRepo } from "../db/repo/BucketRepo.js";
import { BadRequest, InternalServerError, NotFound } from "@tsed/exceptions";
import { AlbumModel } from "../model/db/Album.model.js";
import { Builder } from "builder-pattern";
import crypto from "node:crypto";
import { FileRepo } from "../db/repo/FileRepo.js";
import { FileService } from "./FileService.js";
import { filesDir, FileUtils } from "../utils/Utils.js";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { ThumbnailCacheReo } from "../db/repo/ThumbnailCacheReo.js";
import fs, { ReadStream } from "node:fs";
import archiver from "archiver";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { MimeService } from "./MimeService.js";
import { Logger } from "@tsed/logger";
import { Worker } from "node:worker_threads";

@Service()
export class AlbumService {
    public constructor(
        @Inject() private albumRepo: AlbumRepo,
        @Inject() private bucketRepo: BucketRepo,
        @Inject() private fileRepo: FileRepo,
        @Inject() private fileService: FileService,
        @Inject() private thumbnailCacheReo: ThumbnailCacheReo,
        @Inject() private mimeService: MimeService,
        @Inject() private logger: Logger,
    ) {}

    @Constant(GlobalEnv.ZIP_MAX_SIZE_MB, "512")
    private readonly zipMaxFileSize: string;

    public async createAlbum(name: string, bucketToken: string): Promise<AlbumModel> {
        const bucket = await this.bucketRepo.getBucket(bucketToken);
        if (!bucket) {
            throw new BadRequest(`Bucket with token ${bucketToken} not found`);
        }
        const albumWithNameExists = await this.albumRepo.albumNameExists(name, bucketToken);
        if (albumWithNameExists) {
            throw new BadRequest(`Album with name ${name} already exists`);
        }

        const albumModel = Builder(AlbumModel)
            .bucketToken(bucketToken)
            .name(name)
            .albumToken(crypto.randomUUID())
            .build();
        return this.albumRepo.saveOrUpdateAlbum(albumModel);
    }

    public async getAlbum(albumToken: string): Promise<AlbumModel> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new NotFound("Album not found");
        }
        return album;
    }

    public async deleteAlbum(albumToken: string, removeFiles: boolean): Promise<boolean> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }
        this.checkPrivateToken(albumToken, album);
        const didDeleteAlbum = await this.albumRepo.deleteAlbum(albumToken, removeFiles);
        if (!didDeleteAlbum) {
            throw new BadRequest(`Unable to delete album with token: "${albumToken}"`);
        }
        if (removeFiles) {
            if (album.files) {
                await this.fileService.deleteFilesFromDisk(album.files);
            }
        } else {
            if (album.files) {
                const fileIds = album.files.map(f => f.id);
                await this.thumbnailCacheReo.deleteThumbnailCaches(fileIds);
            }
        }
        return true;
    }

    public async disassociateFilesFromAlbum(albumToken: string, files: string[]): Promise<AlbumModel> {
        let album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }
        this.checkPrivateToken(albumToken, album);
        const filesToRemove = await this.fileRepo.getEntry(files);

        if (album.files && !files.every(file => album!.files!.find(f => f.token === file))) {
            throw new BadRequest(`Every file must be in the same album`);
        }

        album = await this.removeFilesFromAlbum(albumToken, filesToRemove);
        await this.thumbnailCacheReo.deleteThumbnailCaches(filesToRemove.map(f => f.id));
        return album;
    }

    public async assignFilesToAlbum(albumToken: string, files: string[]): Promise<AlbumModel> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }
        this.checkPrivateToken(albumToken, album);
        const filesToAssociate = await this.fileRepo.getEntry(files);
        if (filesToAssociate.length !== files.length) {
            throw new BadRequest(`some files were not found`);
        }

        const albumBucketToken = album.bucketToken;

        if (!filesToAssociate.every(entry => entry.bucketToken === albumBucketToken)) {
            throw new BadRequest(`All files must be in the same bucket`);
        }

        for (const file of filesToAssociate) {
            this.validateForAssociation(file);
        }

        const model = await this.addFilesToAlbum(albumToken, filesToAssociate);

        await this.generateThumbnails(
            album.albumToken,
            filesToAssociate.map(f => f.id),
        );

        return model;
    }

    private async addFilesToAlbum(albumToken: string, files: FileUploadModel[]): Promise<AlbumModel> {
        for (const file of files) {
            file.albumToken = albumToken;
        }
        await this.fileRepo.saveEntries(files);
        return (await this.albumRepo.getAlbum(albumToken))!;
    }

    private async removeFilesFromAlbum(albumToken: string, files: FileUploadModel[]): Promise<AlbumModel> {
        const removeTokens = files.map(f => f.token);
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }
        this.checkPrivateToken(albumToken, album);
        for (const file of album.files ?? []) {
            if (removeTokens.includes(file.token)) {
                file.albumToken = null;
            }
        }
        await this.albumRepo.saveOrUpdateAlbum(album);
        return (await this.albumRepo.getAlbum(albumToken))!;
    }

    public async revokeShare(albumToken: string): Promise<void> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }
        this.checkPrivateToken(albumToken, album);
        album.publicToken = null;
        await this.albumRepo.saveOrUpdateAlbum(album);
    }

    public async shareAlbum(albumToken: string): Promise<string> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }
        this.checkPrivateToken(albumToken, album);
        if (album.publicUrl) {
            return album.publicUrl;
        }
        album.publicToken = crypto.randomUUID();
        const updatedAlbum = await this.albumRepo.saveOrUpdateAlbum(album);

        await this.generateThumbnails(album.albumToken);

        return updatedAlbum.publicUrl!;
    }

    public albumExists(publicToken: string): Promise<boolean> {
        return this.albumRepo.albumExists(publicToken);
    }

    public async generateThumbnails(privateAlbumToken: string, filesIds: number[] = []): Promise<void> {
        const album = await this.albumRepo.getAlbum(privateAlbumToken);
        if (!album) {
            throw new NotFound("Album not found");
        }
        this.checkPrivateToken(privateAlbumToken, album);

        const worker = new Worker(new URL("../workers/generateThumbnails.js", import.meta.url), {
            workerData: {
                privateAlbumToken: privateAlbumToken,
                filesIds,
            },
        });

        const workerPromise: Promise<void> = new Promise((resolve, reject): void => {
            worker.on("message", (message: { success: boolean; error?: string }) => {
                if (message.success) {
                    resolve();
                } else {
                    reject(new Error(message.error));
                }
            });
            worker.on("error", reject);
            worker.on("exit", code => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });
        workerPromise
            .then(() => this.logger.info(`Successfully generated thumbnails for album ${privateAlbumToken}`))
            .catch(e => this.logger.error(e));
    }

    public async getThumbnail(imageId: number, publicAlbumToken: string): Promise<[Buffer, string, boolean]> {
        const album = await this.albumRepo.getAlbum(publicAlbumToken);
        if (!album) {
            throw new NotFound("Album not found");
        }
        this.checkPublicToken(publicAlbumToken, album);
        const entry = album.files?.find(f => f.id === imageId);
        if (!entry) {
            throw new NotFound("File not found");
        }
        if (entry.fileProtectionLevel !== "None") {
            throw new BadRequest("File is protected");
        }

        const thumbnailFromCache = await entry.thumbnailCache;
        if (thumbnailFromCache) {
            const b = Buffer.from(thumbnailFromCache.data, "base64");
            const thumbnailMime = await this.getThumbnailMime(entry, b);
            return [b, thumbnailMime, true];
        }

        if (FileUtils.isValidForThumbnail(entry)) {
            return [
                Buffer.from(
                    "iVBORw0KGgoAAAANSUhEUgAAAMgAAAEKCAYAAABXDxqVAAAAx3pUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHjabVDbDcMwCPz3FB3BPIzxOM5L6gYdv9iQKol6kuHCkTMm7Z/3kV4DCJy4VJUmkg3cuGE3otnRZ4TMM06spwb3erJmp2iZLJMLKtF/1uFn4Gn8Vy5Guoaw3IXGnlEfRnERjYnQyBZGLYwIXYAw6P6sLE3r9QnLnu9QP2mEo5qvNUqYPL+52va2YvcQ4k5A2SIR+wA0TknUJxlRrBGoGAeSWdGYxBbyb08n0hfiM1pW1ukdqgAAAYNpQ0NQSUNDIHByb2ZpbGUAAHicfZE9SMNAHMVfU7UilSJWEHHIUJ3soiKOtQpFqFBqhVYdTC79giYNSYqLo+BacPBjserg4qyrg6sgCH6AuAtOii5S4v+SQosYD4778e7e4+4dIDQqTDW7YoCqWUY6ERezuVUx8AoBPRhCCAMSM/W5VCoJz/F1Dx9f76I8y/vcn6NfyZsM8InEMaYbFvEG8cympXPeJw6zkqQQnxNPGHRB4keuyy6/cS46LPDMsJFJzxOHicViB8sdzEqGSjxNHFFUjfKFrMsK5y3OaqXGWvfkLwzmtZVlrtMcRQKLWEIKImTUUEYFFqK0aqSYSNN+3MM/4vhT5JLJVQYjxwKqUCE5fvA/+N2tWZiadJOCcaD7xbY/xoDALtCs2/b3sW03TwD/M3Cltf3VBjD7SXq9rUWOgNA2cHHd1uQ94HIHGH7SJUNyJD9NoVAA3s/om3LA4C3Qt+b21trH6QOQoa6SN8DBITBepOx1j3f3dvb275lWfz84oXKPiVZ+ZwAADl5pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDQuNC4wLUV4aXYyIj4KIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgIHhtbG5zOkdJTVA9Imh0dHA6Ly93d3cuZ2ltcC5vcmcveG1wLyIKICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICB4bXBNTTpEb2N1bWVudElEPSJnaW1wOmRvY2lkOmdpbXA6MDU3NDVlYTgtZGIzMS00NzExLTg4NTMtNDgwN2U2Y2NkNzYwIgogICB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmE4ZTYyODlhLTg5NDEtNDdhNy1iMzhmLWNhNjIyODA0Zjk1MiIKICAgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjlhZGZjOTc1LTI5YzctNDc1MS04NDlmLTEwN2U0ODc5Yzc3YSIKICAgR0lNUDpBUEk9IjIuMCIKICAgR0lNUDpQbGF0Zm9ybT0iTWFjIE9TIgogICBHSU1QOlRpbWVTdGFtcD0iMTczODg3NjU3MDk3MzUxMyIKICAgR0lNUDpWZXJzaW9uPSIyLjEwLjM0IgogICBkYzpGb3JtYXQ9ImltYWdlL3BuZyIKICAgdGlmZjpPcmllbnRhdGlvbj0iMSIKICAgeG1wOkNyZWF0b3JUb29sPSJHSU1QIDIuMTAiCiAgIHhtcDpNZXRhZGF0YURhdGU9IjIwMjU6MDI6MDZUMTU6MTY6MDgtMDY6MDAiCiAgIHhtcDpNb2RpZnlEYXRlPSIyMDI1OjAyOjA2VDE1OjE2OjA4LTA2OjAwIj4KICAgPHhtcE1NOkhpc3Rvcnk+CiAgICA8cmRmOlNlcT4KICAgICA8cmRmOmxpCiAgICAgIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiCiAgICAgIHN0RXZ0OmNoYW5nZWQ9Ii8iCiAgICAgIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6YzkzMmJlZGQtNGIyYS00NzQ4LWJmZjMtNjY5NGUyMDhiM2ZlIgogICAgICBzdEV2dDpzb2Z0d2FyZUFnZW50PSJHaW1wIDIuMTAgKE1hYyBPUykiCiAgICAgIHN0RXZ0OndoZW49IjIwMjUtMDItMDZUMTQ6NTQ6NDAtMDY6MDAiLz4KICAgICA8cmRmOmxpCiAgICAgIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiCiAgICAgIHN0RXZ0OmNoYW5nZWQ9Ii8iCiAgICAgIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MmUyOWVkOGYtYTM5MS00N2ZlLTkxM2UtODRlNzdlMWMwY2RiIgogICAgICBzdEV2dDpzb2Z0d2FyZUFnZW50PSJHaW1wIDIuMTAgKE1hYyBPUykiCiAgICAgIHN0RXZ0OndoZW49IjIwMjUtMDItMDZUMTU6MTY6MTAtMDY6MDAiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogIDwvcmRmOkRlc2NyaXB0aW9uPgogPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSJ3Ij8+6kiaHwAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAEN9wABDfcBpBbdFwAAAAd0SU1FB+kCBhUQChLOdoIAACAASURBVHja7Z13eFzF1cZ/567kXrAB21rb4NBswJSYngQILWAgWGsgISQQ8pEEvIYQPiCYThIIhEBo9ooSElIgVK8IoSQUm5aPFnrAFGMbrJVp7kWytPd8f8wsvijalbS6u9pdzfs8fixp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",
                    "base64",
                ),
                "image/jpeg",
                false,
            ];
        }

        throw new BadRequest("File not supported for thumbnail generation");
    }

    private async getThumbnailMime(entry: FileUploadModel, thumbNail: Buffer): Promise<string> {
        const detectedMime = await this.mimeService.findMimeTypeFromBuffer(thumbNail);
        if (detectedMime) {
            return detectedMime;
        }
        if (FileUtils.isImage(entry)) {
            return entry.mediaType!;
        } else if (FileUtils.isVideo(entry)) {
            return "image/jpeg";
        } else {
            throw new BadRequest("File not supported for thumbnail generation");
        }
    }

    public async downloadFiles(publicAlbumToken: string, fileIds: number[]): Promise<[ReadStream, string, string]> {
        const album = await this.albumRepo.getAlbum(publicAlbumToken);
        if (!album) {
            throw new NotFound("Album not found");
        }

        const files = album.files ?? [];

        const albumFileIds = files.map(f => f.id);
        if (fileIds.length > 0 && !fileIds.every(file => albumFileIds.includes(file))) {
            throw new BadRequest("Some files were not found in the album");
        }

        const filesToZip = files.filter(
            file => (fileIds.length === 0 || fileIds.includes(file.id)) && file.fileProtectionLevel === "None",
        );

        const sumFileSize = filesToZip.reduce((n, { fileSize }) => n + fileSize, 0);
        const parsedZipSize = Number.parseInt(this.zipMaxFileSize);
        if (parsedZipSize > 0 && sumFileSize > parsedZipSize * 1024 * 1024) {
            throw new BadRequest("Zip file is too large");
        }

        const zipLocation = filesDir + `/${album.name}_${crypto.randomUUID()}.zip`;
        return Promise.all([this.createZip(filesToZip, zipLocation), album.name, zipLocation]);
    }

    public isAlbumTooBigToDownload(album: AlbumModel): boolean {
        const maxFileSizeMb = constant(GlobalEnv.ZIP_MAX_SIZE_MB, "512");
        const parsedValue = Number.parseInt(maxFileSizeMb);
        if (album.files && parsedValue > 0) {
            return album.files.reduce((acc, file) => acc + file.fileSize, 0) > parsedValue * 1024 * 1024;
        }
        return false;
    }

    private async createZip(files: FileUploadModel[], zipLocation: string): Promise<ReadStream> {
        const output = fs.createWriteStream(zipLocation);
        const archive = archiver("zip");

        archive.on("error", err => {
            throw new InternalServerError(err.message);
        });

        archive.pipe(output);
        for (const file of files) {
            archive.file(file.fullLocationOnDisk, { name: file.parsedFileName });
        }

        await archive.finalize();
        return fs.createReadStream(zipLocation);
    }

    private checkPrivateToken(token: string, album: AlbumModel): void {
        if (album.isPublicToken(token)) {
            throw new BadRequest("Supplied token is not valid");
        }
    }

    private checkPublicToken(token: string, album: AlbumModel): void {
        if (!album.isPublicToken(token)) {
            throw new BadRequest("Supplied token is not valid");
        }
    }

    private validateForAssociation(file: FileUploadModel): void {
        if (file.settings?.oneTimeDownload) {
            throw new BadRequest("One time downloads are not allowed");
        }
    }
}
