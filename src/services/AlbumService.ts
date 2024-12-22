import { Constant, Inject, Service } from "@tsed/di";
import { AlbumRepo } from "../db/repo/AlbumRepo.js";
import { AlbumDto } from "../model/dto/AlbumDto.js";
import { BucketRepo } from "../db/repo/BucketRepo.js";
import { BadRequest } from "@tsed/exceptions";
import { AlbumModel } from "../model/db/Album.model.js";
import { Builder } from "builder-pattern";
import crypto from "node:crypto";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { FileRepo } from "../db/repo/FileRepo.js";

@Service()
export class AlbumService {
    public constructor(
        @Inject() private albumRepo: AlbumRepo,
        @Inject() private bucketRepo: BucketRepo,
        @Inject() private fileRepo: FileRepo,
    ) {}

    @Constant(GlobalEnv.BASE_URL)
    private readonly baseUrl: string;

    public async createAlbum(name: string, bucketToken: string): Promise<AlbumDto> {
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
        return AlbumDto.fromModel(createdAlbum, this.baseUrl);
    }

    public async assignFilesToAlbum(albumToken: string, files: string[]): Promise<AlbumDto> {
        const album = await this.albumRepo.getAlbum(albumToken);
        if (!album) {
            throw new BadRequest(`Album with token ${albumToken} not found`);
        }

        const filesToAssociate = await this.fileRepo.getEntry(files);
        if (filesToAssociate.length === 0) {
            throw new BadRequest(`no files found`);
        }

        const albumBucketToken = album.bucketToken;

        if (!filesToAssociate.every(entry => entry.bucketToken === albumBucketToken)) {
            throw new BadRequest(`All files must be in the same bucket`);
        }

        for (const fileToAssociate of filesToAssociate) {
            fileToAssociate.albumToken = albumToken;
        }
        album.addFiles(filesToAssociate);

        const updatedAlbum = await this.albumRepo.saveOrUpdateAlbum(album);
        return AlbumDto.fromModel(updatedAlbum, this.baseUrl);
    }

    private async albumExists(name: string, bucketToken: string): Promise<boolean> {
        const album = await this.albumRepo.getAlbumFromName(name, bucketToken);
        return album !== null;
    }
}
