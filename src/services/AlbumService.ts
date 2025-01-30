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
import { ThumbnailCacheModel } from "../model/db/ThumbnailCache.model.js";
import { ThumbnailCacheReo } from "../db/repo/ThumbnailCacheReo.js";
import fs, { ReadStream } from "node:fs";
import archiver from "archiver";
import sharp from "sharp";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { PassThrough } from "node:stream";
import ffmpeg from "../utils/ffmpgWrapper.js";

@Service()
export class AlbumService {
    public constructor(
        @Inject() private albumRepo: AlbumRepo,
        @Inject() private bucketRepo: BucketRepo,
        @Inject() private fileRepo: FileRepo,
        @Inject() private fileService: FileService,
        @Inject() private thumbnailCacheReo: ThumbnailCacheReo,
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

        return this.addFilesToAlbum(albumToken, filesToAssociate);
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

        if (entry.fileProtectionLevel !== "None") {
            throw new BadRequest("File is protected");
        }

        const thumbnailFromCache = await entry.thumbnailCache;
        const mime = this.getThumbnailMime(entry);
        if (thumbnailFromCache) {
            const b = Buffer.from(thumbnailFromCache.data, "base64");
            return Promise.all([b, mime]);
        }

        const path = entry.fullLocationOnDisk;
        let thumbnail: Buffer;
        if (FileUtils.isImage(entry)) {
            thumbnail = await this.generateImageThumbnail(path);
        } else if (FileUtils.isVideoSupportedByFfmpeg(entry)) {
            // we use ffmpeg to get thumbnail, so the video MUST be supported by the clients ffmpeg
            thumbnail = await this.generateVideoThumbnail(path);
        } else {
            throw new BadRequest("File not supported for thumbnail generation");
        }

        if (thumbnail.length === 0) {
            throw new InternalServerError("Unable to generate thumbnail");
        }

        const thumbnailCache = new ThumbnailCacheModel();
        thumbnailCache.data = thumbnail.toString("base64");
        thumbnailCache.fileId = entry.id;
        await this.thumbnailCacheReo.saveThumbnailCache(thumbnailCache);

        return [thumbnail, mime];
    }

    private getThumbnailMime(entry: FileUploadModel): string {
        if (FileUtils.isImage(entry)) {
            return entry.mediaType!;
        } else if (FileUtils.isVideo(entry)) {
            return "image/jpeg";
        } else {
            throw new BadRequest("File not supported for thumbnail generation");
        }
    }

    private async generateImageThumbnail(path: string): Promise<Buffer> {
        const fileBuffer = await fs.promises.readFile(path);

        const metadata = await sharp(fileBuffer).withMetadata().metadata();
        const SCALING_FACTOR = 0.3;
        const DEFAULT_GIF_WIDTH = 200;

        const thumbnailBuilder = sharp(fileBuffer, {
            animated: true,
        }).rotate();

        if (metadata.width && metadata.height && metadata.height > 200) {
            const resizedWidth = Math.floor(metadata.width * SCALING_FACTOR);
            const resizedHeight = Math.floor(metadata.height * SCALING_FACTOR);
            thumbnailBuilder.resize({
                withoutEnlargement: true,
                width: resizedWidth,
                height: resizedHeight,
            });
        } else {
            thumbnailBuilder.resize({
                width: DEFAULT_GIF_WIDTH,
                withoutEnlargement: true,
            });
        }

        return thumbnailBuilder.toBuffer();
    }

    private generateVideoThumbnail(videoPath: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    return reject(new Error(`Failed to retrieve video metadata: ${err.message}`));
                }

                const duration = metadata.format.duration;
                if (!duration) {
                    return reject(new Error("Could not determine video duration."));
                }

                const randomTimestamp = Math.random() * duration;
                const passThroughStream = new PassThrough();
                const imageBuffer: Buffer[] = [];

                passThroughStream.on("data", chunk => imageBuffer.push(chunk));
                passThroughStream.on("end", () => resolve(Buffer.concat(imageBuffer)));
                passThroughStream.on("error", reject);

                ffmpeg(videoPath)
                    .setStartTime(randomTimestamp)
                    .frames(1)
                    .outputOptions("-f", "image2")
                    .outputOptions("-vcodec", "mjpeg")
                    .outputOptions("-q:v", "10")
                    .outputOptions("-vf", "scale=-1:200")
                    .output(passThroughStream)
                    .on("error", err => reject(new Error(`Failed to generate video thumbnail: ${err.message}`)))
                    .on("end", () => passThroughStream.end())
                    .run();
            });
        });
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
