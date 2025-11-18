import multer from "multer";
import { Request } from "express";
import fs from "node:fs";
import { filesDir, FileUtils } from "../../utils/Utils.js";
import { uuid } from "../../utils/uuidUtils.js";
import { RequestEntityTooLarge } from "@tsed/exceptions";
import { inject } from "@tsed/di";
import { SettingsService } from "../../services/SettingsService.js";
import { BucketService } from "../../services/BucketService.js";

export class SizeLimitDiskStorage implements multer.StorageEngine {
    public _handleFile(
        _req: Request,
        file: Express.Multer.File,
        callback: (error?: Error | null, info?: Partial<Express.Multer.File>) => void,
    ): void {
        (async (): Promise<void> => {
            const maxFileSize = await this.getFileSizeLimit(_req);

            const contentLength = _req.header("Content-Length");
            if (contentLength && maxFileSize && Number.parseInt(contentLength) > maxFileSize) {
                return callback(new RequestEntityTooLarge("File size exceeds limit"));
            }

            const ext = FileUtils.getExtension(file.originalname);
            const token = uuid();
            const fileName = ext ? `${token}.${ext}` : token;
            const filePath = `${filesDir}/${fileName}`;

            const outStream = fs.createWriteStream(filePath);
            let fileSize = 0;
            let hasError = false;

            if (maxFileSize) {
                file.stream.on("data", (chunk: Buffer) => {
                    if (hasError) {
                        return;
                    }

                    fileSize += chunk.length;
                    if (fileSize > maxFileSize) {
                        hasError = true;
                        file.stream.unpipe(outStream);
                        file.stream.pause();
                        outStream.destroy();
                        fs.rm(filePath, () => {});
                        callback(new RequestEntityTooLarge(`File size exceeds limit of ${maxFileSize} bytes`));
                    }
                });
            }

            file.stream.on("error", (err: Error) => {
                if (hasError) {
                    return;
                }
                hasError = true;
                outStream.destroy();
                fs.rm(filePath, () => {});
                callback(err);
            });

            file.stream.on("end", () => {
                if (hasError) {
                    return;
                }
                outStream.end(() => {
                    callback(null, {
                        destination: filesDir,
                        filename: fileName,
                        path: filePath,
                        size: fileSize,
                    });
                });
            });

            file.stream.pipe(outStream);
        })().catch(err => {
            callback(err as Error);
        });
    }

    public _removeFile(_req: Request, file: Express.Multer.File, callback: (error: Error | null) => void): void {
        fs.rm(file.path, callback);
    }

    private async getFileSizeLimit(req: Request): Promise<number | null> {
        const settingsService = inject(SettingsService);
        const defaultMaxFileSize = settingsService.getMaxFileSize();
        const bucketToken = req.params.bucketToken;
        if (!bucketToken) {
            return defaultMaxFileSize;
        }

        const bucketService = inject(BucketService);
        const bucket = await bucketService.getBucket(bucketToken, false, false);
        if (!bucket || bucket.type === "NORMAL") {
            return defaultMaxFileSize;
        }

        return null; // premium buckets have no size limit
    }
}
