import { parentPort, workerData } from "node:worker_threads";
import { FileUtils } from "../utils/Utils.js";
import { ThumbnailCacheModel } from "../model/db/ThumbnailCache.model.js";
import sharp from "sharp";
import ffmpeg from "../utils/ffmpgWrapper.js";
import { PassThrough } from "node:stream";
import { ThumbnailCacheRepo } from "../db/repo/ThumbnailCacheRepo.js";
import { AlbumModel } from "../model/db/Album.model.js";
import { NotFound } from "@tsed/exceptions";
import { inject, injector } from "@tsed/di";
import { AlbumRepo } from "../db/repo/AlbumRepo.js";
import { registerDatasource } from "../db/registerDatasource.js";
import { Logger } from "@tsed/logger";
import { $log } from "@tsed/common";
import { DataSource } from "typeorm";
import { REDIS_CONNECTION, SQLITE_DATA_SOURCE } from "../model/di/tokens.js";
import "../redis/Connection.js";
import { initRedisProvider, RedisConnection } from "../redis/Connection.js";

async function generateThumbnails(
    album: AlbumModel,
    thumbnailCacheReo: ThumbnailCacheRepo,
    logger: Logger,
    filesIds: number[] = [],
): Promise<void> {
    const entries =
        album.files?.filter(
            f => f.fileProtectionLevel === "None" && (filesIds.length === 0 || filesIds.includes(f.id)),
        ) ?? [];

    const cacheResults = await thumbnailCacheReo.hasThumbnails(entries.map(e => e.id));
    const thumbnailBufferPromises = entries
        .filter(entry => !cacheResults.includes(entry.id) && FileUtils.isValidForThumbnail(entry))
        .map(entry => {
            const path = entry.fullLocationOnDisk;
            let buff: Promise<Buffer | null>;
            if (FileUtils.isImage(entry)) {
                buff = generateImageThumbnail(path).catch(err => {
                    logger.error(`Failed to generate thumbnail for ${entry.id}: ${err.message}`);
                    return null;
                });
            } else if (FileUtils.isVideoSupportedByFfmpeg(entry)) {
                // we use ffmpeg to get thumbnail, so the video MUST be supported by the clients ffmpeg
                buff = generateVideoThumbnail(path);
            } else {
                logger.error("File not supported for thumbnail generation");
                return;
            }
            return Promise.all([buff, entry]);
        });

    if (thumbnailBufferPromises.length === 0) {
        return;
    }

    const thumbnailBuffers = await Promise.all(thumbnailBufferPromises);
    const thumbnailCache = thumbnailBuffers
        .filter(tuple => !!tuple)
        .filter(([thumbnail]) => !!thumbnail)
        .map(([thumbnail, entry]) => {
            const thumbnailCache = new ThumbnailCacheModel();
            thumbnailCache.data = thumbnail!.toString("base64");
            thumbnailCache.fileId = entry.id;
            return thumbnailCache;
        });
    await thumbnailCacheReo.saveThumbnailCaches(thumbnailCache);
}

function generateImageThumbnail(path: string): Promise<Buffer> {
    const DEFAULT_WIDTH = 400;

    return sharp(path, {
        animated: true,
    })
        .rotate()
        .resize({
            width: DEFAULT_WIDTH,
            withoutEnlargement: true,
        })
        .webp({
            quality: 50,
        })
        .toBuffer();
}

function generateVideoThumbnail(videoPath: string): Promise<Buffer> {
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
let ds: DataSource | undefined;
try {
    $log.level = "info";
    registerDatasource();
    initRedisProvider();
    const url = new URL(workerData.redisUri);
    const i = injector();
    const settings: Partial<TsED.Configuration> = {};
    settings["ioredis"] = [
        {
            name: "default",
            cache: true,
            host: url.hostname,
            port: Number.parseInt(url.port),
        },
    ];
    i.settings.set(settings);
    await i.load();

    ds = inject(SQLITE_DATA_SOURCE);
    const album = await inject(AlbumRepo).getAlbum(workerData.privateAlbumToken);
    if (!album || album.isPublicToken(workerData.privateAlbumToken)) {
        throw new NotFound("Album not found");
    }
    const thumbnailCacheReo = inject(ThumbnailCacheRepo);
    await generateThumbnails(album, thumbnailCacheReo, $log, workerData.filesIds);
    parentPort?.postMessage({ success: true });
} catch (err) {
    parentPort?.postMessage({ success: false, error: err.message });
} finally {
    parentPort?.close();
    if (ds) {
        $log.info("Closing datasource on worker thread");
        await ds.destroy();
    }
    const redisConn: RedisConnection = inject(REDIS_CONNECTION);
    redisConn.quit();
    $log.info("Closing redis connection on worker thread");
}
