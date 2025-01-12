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

@Service()
export class AlbumService {
    public constructor(
        @Inject() private albumRepo: AlbumRepo,
        @Inject() private bucketRepo: BucketRepo,
        @Inject() private fileRepo: FileRepo,
        @Inject() private fileService: FileService,
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

    public async downloadFiles(publicAlbumToken: string, fileIds: number[]): Promise<Buffer> {
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

        return this.createZip(
            files
                .filter(
                    file => (fileIds.length === 0 || fileIds.includes(file.id)) && file.fileProtectionLevel === "None",
                )
                .map(file => file.fullLocationOnDisk),
        );
    }

    private async createZip(files: string[]): Promise<Buffer> {
        const zip = new AdmZip();
        await Promise.all(files.map(f => this.zipFile(f, zip)));
        return zip.toBufferPromise();
    }

    private zipFile(file: string, zip: AdmZip): Promise<void> {
        return new Promise((resolve, reject) => {
            // @ts-expect-error method doesn't exist
            zip.addLocalFileAsync(file, (err?: string, success?: boolean) => {
                if (!success) {
                    reject(err);
                }
                resolve();
            });
        });
    }
}
