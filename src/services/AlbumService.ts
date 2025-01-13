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

    public async assignFilesToAlbum(albumToken: string, files: string[]): Promise<AlbumModel> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }

        const filesToAssociate = await this.fileRepo.getEntry(files);
        if (filesToAssociate.length !== files.length) {
            throw new BadRequest(`some files were not found`);
        }

        const albumBucketToken = album.bucketToken;

        if (!filesToAssociate.every(entry => entry.bucketToken === albumBucketToken)) {
            throw new BadRequest(`All files must be in the same bucket`);
        }

        album.addFiles(filesToAssociate);

        return this.albumRepo.saveOrUpdateAlbum(album);
    }

    public async revokeShare(albumToken: string): Promise<void> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }
        if (!album.isPublicToken(albumToken)) {
            throw new BadRequest("Supplied token is not valid");
        }
        album.publicToken = null;
        await this.albumRepo.saveOrUpdateAlbum(album);
    }

    public async shareAlbum(albumToken: string): Promise<string> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }
        if (album.isPublicToken(albumToken)) {
            throw new BadRequest("Supplied token is not valid");
        }
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

    public async generateThumbnail(imageId: number, albumToken: string): Promise<[Buffer, string]> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new NotFound("Album not found");
        }
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
        });

        const thumbnailCache = new ThumbnailCacheModel();
        thumbnailCache.data = thumbnail.toString("base64");

        const c = await this.thumbnailCacheReo.saveThumbnailCache(thumbnailCache);
        entry.thumbnailId = c.id;
        await this.fileRepo.saveEntry(entry);

        return [thumbnail, entry.mediaType!];
    }

    public async downloadFiles(publicAlbumToken: string, fileIds: number[]): Promise<[Buffer, string]> {
        const album = await this.albumRepo.getAlbum(publicAlbumToken);
        if (!album) {
            throw new NotFound("Album not found");
        }

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
}
