import { Inject, Service } from "@tsed/di";
import { AlbumRepo } from "../db/repo/AlbumRepo.js";
import { BucketRepo } from "../db/repo/BucketRepo.js";
import { BadRequest } from "@tsed/exceptions";
import { AlbumModel } from "../model/db/Album.model.js";
import { Builder } from "builder-pattern";
import crypto from "node:crypto";
import { FileRepo } from "../db/repo/FileRepo.js";
import { FileService } from "./FileService.js";

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
        const albumWithNameExists = await this.albumExists(name, bucketToken);
        if (albumWithNameExists) {
            throw new BadRequest(`Album with name ${name} already exists`);
        }
        const albumModel = Builder(AlbumModel)
            .bucketToken(bucketToken)
            .name(name)
            .albumToken(crypto.randomUUID())
            .build();
        const createdAlbum = await this.albumRepo.saveOrUpdateAlbum(albumModel);
        return createdAlbum;
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

        const updatedAlbum = await this.albumRepo.saveOrUpdateAlbum(album);
        return updatedAlbum;
    }

    private albumExists(name: string, bucketToken: string): Promise<boolean> {
        return this.albumRepo.albumNameExists(name, bucketToken);
    }
}
