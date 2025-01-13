import { Inject, Service } from "@tsed/di";
import { AlbumRepo } from "../db/repo/AlbumRepo.js";
import { BucketRepo } from "../db/repo/BucketRepo.js";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { AlbumModel } from "../model/db/Album.model.js";
import { Builder } from "builder-pattern";
import crypto from "node:crypto";
import { FileRepo } from "../db/repo/FileRepo.js";
import { FileService } from "./FileService.js";
import AdmZip from "adm-zip";
import { FileUtils } from "../utils/Utils.js";
import Module from "node:module";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { ThumbnailCacheModel } from "../model/db/ThumbnailCache.model.js";
import { ThumbnailCacheReo } from "../db/repo/ThumbnailCacheReo.js";

const require = Module.createRequire(import.meta.url);
const imageThumbnail = require("image-thumbnail");

@Service()
export class AlbumService {
    public constructor(
        @Inject() private albumRepo: AlbumRepo,
        @Inject() private bucketRepo: BucketRepo,
        @Inject() private fileRepo: FileRepo,
        @Inject() private fileService: FileService,
        @Inject() private thumbnailCacheReo: ThumbnailCacheReo,
    ) {}

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
        }
        return true;
    }

    public async disassociateFilesFromAlbum(albumToken: string, files: string[]): Promise<AlbumModel> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }
        this.checkPrivateToken(albumToken, album);
        const filesToRemove = await this.fileRepo.getEntry(files);
        if (filesToRemove.length !== files.length) {
            throw new BadRequest(`some files were not found`);
        }

        album.removeFiles(filesToRemove);
        await this.albumRepo.saveOrUpdateAlbum(album);
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

        album.addFiles(filesToAssociate);

        return this.albumRepo.saveOrUpdateAlbum(album);
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
        if (album.publicToken) {
            return album.publicToken;
        }
        album.publicToken = crypto.randomUUID();
        const updatedAlbum = await this.albumRepo.saveOrUpdateAlbum(album);
        return updatedAlbum.publicUrl!;
    }

    public albumExists(publicToken: string): Promise<boolean> {
        return this.albumRepo.albumExists(publicToken);
    }

    public async generateThumbnail(imageId: number, publicAlbumToken: string): Promise<[Buffer, string]> {
        const album = await this.albumRepo.getAlbum(publicAlbumToken);
        if (!album) {
            throw new NotFound("Album not found");
        }
        this.checkPublicToken(publicAlbumToken, album);
        const entry = album.files?.find(f => f.id === imageId);

        if (!entry) {
            throw new NotFound("File not found");
        }
        if (!FileUtils.isImage(entry)) {
            throw new BadRequest("File is not an image");
        }
        if (entry.fileProtectionLevel !== "None") {
            throw new BadRequest("File is protected");
        }

        const thumbnailFromCache = await entry.thumbnailCache;
        if (thumbnailFromCache) {
            const b = Buffer.from(thumbnailFromCache.data, "base64");
            return Promise.all([b, entry.mediaType!]);
        }

        const thumbnail: Buffer = await imageThumbnail(entry.fullLocationOnDisk, {
            withMetaData: true,
            percentage: 30,
        });

        const thumbnailCache = new ThumbnailCacheModel();
        thumbnailCache.data = thumbnail.toString("base64");
        thumbnailCache.fileId = entry.id;
        await this.thumbnailCacheReo.saveThumbnailCache(thumbnailCache);

        return [thumbnail, entry.mediaType!];
    }

    public async downloadFiles(publicAlbumToken: string, fileIds: number[]): Promise<[Buffer, string]> {
        const album = await this.albumRepo.getAlbum(publicAlbumToken);
        if (!album) {
            throw new NotFound("Album not found");
        }
        this.checkPublicToken(publicAlbumToken, album);

        let { files } = album;
        if (!files) {
            files = [];
        }

        const albumFileIds = files.map(f => f.id);
        if (fileIds.length > 0 && !fileIds.every(file => albumFileIds.includes(file))) {
            throw new BadRequest("Some files were not found in the album");
        }

        return Promise.all([
            this.createZip(
                files.filter(
                    file => (fileIds.length === 0 || fileIds.includes(file.id)) && file.fileProtectionLevel === "None",
                ),
            ),
            album.name,
        ]);
    }

    private async createZip(files: FileUploadModel[]): Promise<Buffer> {
        const zip = new AdmZip();
        await Promise.all(files.map(f => this.zipFile(f.fullLocationOnDisk, f.parsedFileName, zip)));
        return zip.toBufferPromise();
    }

    private zipFile(file: string, filename: string, zip: AdmZip): Promise<void> {
        return new Promise((resolve, reject) => {
            // @ts-expect-error method doesn't exist
            zip.addLocalFileAsync(
                {
                    localPath: file,
                    zipName: filename,
                },
                (err?: string, success?: boolean) => {
                    if (!success) {
                        reject(err);
                    }
                    resolve();
                },
            );
        });
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
