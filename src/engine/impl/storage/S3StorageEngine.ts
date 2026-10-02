import { Inject, Injectable, ProviderScope } from "@tsed/di";
import {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CopyObjectCommand,
    CreateMultipartUploadCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    paginateListObjectsV2,
    PutObjectCommand,
    S3Client,
    UploadPartCopyCommand,
    type CompletedPart,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Logger } from "@tsed/logger";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import type { Readable } from "node:stream";
import type { IStorageEngine } from "../../IStorageEngine.js";
import type { ByteRange, StorageBackend, StoredObjectInfo } from "../../../utils/typeings.js";
import { StorageNotFoundError } from "../../../model/exceptions/StorageNotFoundError.js";
import { StorageOperationError } from "../../../model/exceptions/StorageOperationError.js";
import { SettingsService } from "../../../services/SettingsService.js";
import { GlobalEnv } from "../../../model/constants/GlobalEnv.js";
import { STORAGE_ENGINE } from "../../../model/di/tokens.js";

type S3Settings = {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
};

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: STORAGE_ENGINE,
})
export class S3StorageEngine implements IStorageEngine {
    private readonly softDeletedFolder = "soft-deleted/";
    private readonly deleteBatchSize = 1000;
    private readonly maxSingleCopyBytes = 5 * 1024 ** 3;
    private readonly multipartCopyPartBytes = 1024 ** 3;
    private readonly uploadPartBytes = 16 * 1024 ** 2;
    private readonly uploadQueueSize = 4;
    private readonly softDeleteConcurrency = 16;
    private readonly maxSockets = 512;

    private readonly client: S3Client | null = null;
    private readonly bucket: string = "";
    private readonly prefix: string;
    private readonly softDeleteEnabled: boolean;

    public constructor(
        @Inject() settingsService: SettingsService,
        @Inject() private logger: Logger,
    ) {
        this.prefix = this.normalisePrefix(settingsService.getSetting(GlobalEnv.S3_PREFIX));
        this.softDeleteEnabled = !!settingsService.getSetting(GlobalEnv.SOFT_DELETE_LOCATION);

        const settings = this.readSettings(settingsService);
        if (!settings) {
            return;
        }

        this.bucket = settings.bucket;
        this.client = new S3Client({
            endpoint: settings.endpoint,
            region: settings.region,
            forcePathStyle: settings.forcePathStyle,
            credentials: {
                accessKeyId: settings.accessKeyId,
                secretAccessKey: settings.secretAccessKey,
            },
            requestChecksumCalculation: "WHEN_REQUIRED",
            responseChecksumValidation: "WHEN_REQUIRED",
            requestHandler: new NodeHttpHandler({
                httpAgent: new http.Agent({ keepAlive: true, maxSockets: this.maxSockets }),
                httpsAgent: new https.Agent({ keepAlive: true, maxSockets: this.maxSockets }),
            }),
        });
    }

    public get id(): StorageBackend {
        return "s3";
    }

    public get enabled(): boolean {
        return this.client !== null;
    }

    public async get(key: string, range?: ByteRange): Promise<Readable> {
        let body: Readable;
        try {
            const response = await this.s3.send(
                new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: this.objectKey(key),
                    Range: range ? `bytes=${range.start}-${range.end}` : undefined,
                }),
            );
            body = response.Body as Readable;
        } catch (e) {
            throw this.mapError(e, key);
        }

        body.on("error", () => {
            body.destroy();
        });

        return body;
    }

    public async getBuffer(key: string): Promise<Buffer> {
        try {
            const response = await this.s3.send(
                new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: this.objectKey(key),
                }),
            );
            const bytes = await response.Body!.transformToByteArray();
            return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        } catch (e) {
            throw this.mapError(e, key);
        }
    }

    public async put(key: string, body: Buffer): Promise<void> {
        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: this.objectKey(key),
                Body: body,
                ContentLength: body.length,
            }),
        );
    }

    public async putFile(key: string, localPath: string): Promise<void> {
        const { size } = await fs.stat(localPath);
        const body = createReadStream(localPath);

        const upload = new Upload({
            client: this.s3,
            queueSize: this.uploadQueueSize,
            partSize: this.uploadPartBytes,
            leavePartsOnError: false,
            params: {
                Bucket: this.bucket,
                Key: this.objectKey(key),
                Body: body,
                ContentLength: size,
            },
        });

        try {
            await upload.done();
        } finally {
            body.destroy();
        }

        await fs.rm(localPath, { force: true });
    }

    public async head(key: string): Promise<StoredObjectInfo | null> {
        try {
            const response = await this.s3.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: this.objectKey(key),
                }),
            );
            return {
                key,
                size: response.ContentLength ?? 0,
                lastModified: response.LastModified ?? new Date(0),
            };
        } catch (e) {
            if (this.isNotFound(e)) {
                return null;
            }
            throw e;
        }
    }

    public async delete(keys: string[]): Promise<void> {
        const objectKeys = keys.map(key => this.objectKey(key));
        const failures = await this.deleteObjectKeys(objectKeys);

        this.throwOnFailures(failures, "delete");
    }

    public async softDelete(keys: string[]): Promise<void> {
        if (!this.softDeleteEnabled) {
            return this.delete(keys);
        }

        const failures: unknown[] = [];
        const copied: string[] = [];

        for (let i = 0; i < keys.length; i += this.softDeleteConcurrency) {
            const batch = keys.slice(i, i + this.softDeleteConcurrency);
            const results = await Promise.allSettled(batch.map(key => this.copyToSoftDeleted(key)));

            for (const [index, result] of results.entries()) {
                if (result.status === "rejected") {
                    failures.push(result.reason);
                    continue;
                }
                if (result.value) {
                    copied.push(this.objectKey(batch[index]));
                }
            }
        }

        failures.push(...(await this.deleteObjectKeys(copied)));

        this.throwOnFailures(failures, "soft delete");
    }

    public async *list(): AsyncIterable<string> {
        const pages = paginateListObjectsV2(
            { client: this.s3 },
            {
                Bucket: this.bucket,
                Prefix: this.prefix || undefined,
                Delimiter: "/",
            },
        );

        for await (const page of pages) {
            for (const object of page.Contents ?? []) {
                const key = object.Key?.slice(this.prefix.length);
                if (!key || key.includes("/")) {
                    continue;
                }
                yield key;
            }
        }
    }

    private get s3(): S3Client {
        if (!this.client) {
            throw new Error("S3 storage is not configured");
        }
        return this.client;
    }

    private async copyToSoftDeleted(key: string): Promise<boolean> {
        const info = await this.head(key);
        if (!info) {
            return false;
        }

        const source = this.objectKey(key);
        const destination = `${this.prefix}${this.softDeletedFolder}${key}`;

        if (info.size > this.maxSingleCopyBytes) {
            await this.multipartCopy(source, destination, info.size);
            return true;
        }

        try {
            await this.s3.send(
                new CopyObjectCommand({
                    Bucket: this.bucket,
                    Key: destination,
                    CopySource: this.copySource(source),
                }),
            );
        } catch (e) {
            if (this.isNotFound(e)) {
                return false;
            }
            throw e;
        }
        return true;
    }

    private async multipartCopy(source: string, destination: string, size: number): Promise<void> {
        const { UploadId: uploadId } = await this.s3.send(
            new CreateMultipartUploadCommand({
                Bucket: this.bucket,
                Key: destination,
            }),
        );
        if (!uploadId) {
            throw new Error(`Failed to start a multipart copy of ${source}`);
        }

        try {
            const parts: CompletedPart[] = [];
            for (let start = 0; start < size; start += this.multipartCopyPartBytes) {
                const end = Math.min(start + this.multipartCopyPartBytes, size) - 1;
                const partNumber = parts.length + 1;

                const response = await this.s3.send(
                    new UploadPartCopyCommand({
                        Bucket: this.bucket,
                        Key: destination,
                        UploadId: uploadId,
                        PartNumber: partNumber,
                        CopySource: this.copySource(source),
                        CopySourceRange: `bytes=${start}-${end}`,
                    }),
                );

                parts.push({ ETag: response.CopyPartResult?.ETag, PartNumber: partNumber });
            }

            await this.s3.send(
                new CompleteMultipartUploadCommand({
                    Bucket: this.bucket,
                    Key: destination,
                    UploadId: uploadId,
                    MultipartUpload: { Parts: parts },
                }),
            );
        } catch (e) {
            await this.s3
                .send(
                    new AbortMultipartUploadCommand({
                        Bucket: this.bucket,
                        Key: destination,
                        UploadId: uploadId,
                    }),
                )
                .catch(abortError => {
                    this.logger.error(
                        `Failed to abort multipart copy ${uploadId} to ${destination}: ${(abortError as Error).message}`,
                    );
                });
            throw e;
        }
    }

    private async deleteObjectKeys(objectKeys: string[]): Promise<unknown[]> {
        const failures: unknown[] = [];

        for (let i = 0; i < objectKeys.length; i += this.deleteBatchSize) {
            const batch = objectKeys.slice(i, i + this.deleteBatchSize);

            try {
                const response = await this.s3.send(
                    new DeleteObjectsCommand({
                        Bucket: this.bucket,
                        Delete: {
                            Objects: batch.map(objectKey => ({ Key: objectKey })),
                            Quiet: true,
                        },
                    }),
                );

                for (const error of response.Errors ?? []) {
                    if (error.Code === "NoSuchKey") {
                        continue;
                    }
                    failures.push(
                        new Error(`Failed to delete ${error.Key}: ${error.Code ?? "Unknown"} ${error.Message ?? ""}`),
                    );
                }
            } catch (e) {
                failures.push(e);
            }
        }

        return failures;
    }

    private objectKey(key: string): string {
        if (!key || key === "." || key === ".." || key.includes("/") || key.includes("\\")) {
            throw new Error(`Invalid storage key ${key}`);
        }
        return `${this.prefix}${key}`;
    }

    private copySource(objectKey: string): string {
        const encodedKey = objectKey
            .split("/")
            .map(segment => encodeURIComponent(segment))
            .join("/");
        return `${this.bucket}/${encodedKey}`;
    }

    private throwOnFailures(failures: unknown[], operation: string): void {
        if (failures.length > 0) {
            throw new StorageOperationError(failures, `Failed to ${operation} ${failures.length} stored object(s)`);
        }
    }

    private isNotFound(e: unknown): boolean {
        const error = e as { name?: string; $metadata?: { httpStatusCode?: number } };
        return error?.name === "NoSuchKey" || error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404;
    }

    private mapError(e: unknown, key: string): unknown {
        return this.isNotFound(e) ? new StorageNotFoundError(key) : e;
    }

    private normalisePrefix(rawPrefix: string): string {
        const trimmed = rawPrefix.replace(/\/+$/, "");
        return trimmed ? `${trimmed}/` : "";
    }

    private readSettings(settingsService: SettingsService): S3Settings | null {
        const endpoint = settingsService.getSetting(GlobalEnv.S3_ENDPOINT);
        const bucket = settingsService.getSetting(GlobalEnv.S3_BUCKET);
        const accessKeyId = settingsService.getSetting(GlobalEnv.S3_ACCESS_KEY_ID);
        const secretAccessKey = settingsService.getSetting(GlobalEnv.S3_SECRET_ACCESS_KEY);
        const region = settingsService.getSetting(GlobalEnv.S3_REGION);

        if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !region) {
            return null;
        }

        return {
            endpoint,
            bucket,
            accessKeyId,
            secretAccessKey,
            region,
            forcePathStyle: settingsService.getSetting(GlobalEnv.S3_FORCE_PATH_STYLE).toLowerCase() === "true",
        };
    }
}
