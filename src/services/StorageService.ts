import { Inject, OnInit, Service } from "@tsed/di";
import { Logger } from "@tsed/logger";
import fs from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import type { IStorageProvider } from "../engine/IStorageProvider.js";
import type { ByteRange, StorageBackend, StoredObjectInfo } from "../utils/typeings.js";
import { StorageOperationError } from "../model/exceptions/StorageOperationError.js";
import { LocalStorageProvider } from "../engine/impl/storage/LocalStorageProvider.js";
import { S3StorageProvider } from "../engine/impl/storage/S3StorageProvider.js";
import { SettingsService } from "./SettingsService.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";
import { stagingDir } from "../utils/Utils.js";

@Service()
export class StorageService implements OnInit {
    private readonly providers: Map<StorageBackend, IStorageProvider>;
    private readonly defaultProvider: IStorageProvider;

    public constructor(
        @Inject() localStorageProvider: LocalStorageProvider,
        @Inject() s3StorageProvider: S3StorageProvider,
        @Inject() settingsService: SettingsService,
        @Inject() private logger: Logger,
    ) {
        this.providers = new Map<StorageBackend, IStorageProvider>([[localStorageProvider.id, localStorageProvider]]);
        if (s3StorageProvider.enabled) {
            this.providers.set(s3StorageProvider.id, s3StorageProvider);
        }

        const configuredBackend = settingsService.getSetting(GlobalEnv.STORAGE_BACKEND);
        const defaultProvider = this.providers.get(configuredBackend as StorageBackend);
        if (!defaultProvider) {
            throw new Error(
                `STORAGE_BACKEND is "${configuredBackend}" but no storage provider is configured for it. Valid values are "local" and "s3", and "s3" requires S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY to be set`,
            );
        }
        this.defaultProvider = defaultProvider;
    }

    public async $onInit(): Promise<void> {
        await fs.mkdir(stagingDir, { recursive: true });
    }

    public get backends(): StorageBackend[] {
        return [...this.providers.keys()];
    }

    public openStream(entry: FileUploadModel, range?: ByteRange): Promise<Readable> {
        return this.providerFor(entry.storageBackend).get(entry.fullFileNameOnSystem, range);
    }

    public readAll(entry: FileUploadModel): Promise<Buffer> {
        return this.providerFor(entry.storageBackend).getBuffer(entry.fullFileNameOnSystem);
    }

    public write(entry: FileUploadModel, body: Buffer): Promise<void> {
        return this.providerFor(entry.storageBackend).put(entry.fullFileNameOnSystem, body);
    }

    public async commit(stagedPath: string, entry: FileUploadModel): Promise<StorageBackend> {
        await this.defaultProvider.putFile(entry.fullFileNameOnSystem, stagedPath);
        return this.defaultProvider.id;
    }

    public async exists(entry: FileUploadModel): Promise<boolean> {
        const info = await this.providerFor(entry.storageBackend).head(entry.fullFileNameOnSystem);
        return info !== null;
    }

    public async delete(entries: FileUploadModel[], soft = false): Promise<void> {
        const keysByBackend = new Map<StorageBackend, string[]>();
        for (const entry of entries) {
            const keys = keysByBackend.get(entry.storageBackend) ?? [];
            keys.push(entry.fullFileNameOnSystem);
            keysByBackend.set(entry.storageBackend, keys);
        }

        const failures: unknown[] = [];
        for (const [backend, keys] of keysByBackend) {
            try {
                await this.deleteKeys(backend, keys, soft);
            } catch (e) {
                failures.push(...(e instanceof StorageOperationError ? e.failures : [e]));
            }
        }

        if (failures.length > 0) {
            throw new StorageOperationError(failures, `Failed to delete ${failures.length} stored object(s)`);
        }
    }

    public deleteKeys(backend: StorageBackend, keys: string[], soft = false): Promise<void> {
        if (keys.length === 0) {
            return Promise.resolve();
        }
        const provider = this.providerFor(backend);
        return soft ? provider.softDelete(keys) : provider.delete(keys);
    }

    public headKey(backend: StorageBackend, key: string): Promise<StoredObjectInfo | null> {
        return this.providerFor(backend).head(key);
    }

    public listKeys(backend: StorageBackend): AsyncIterable<string> {
        return this.providerFor(backend).list();
    }

    public async countObjects(): Promise<number> {
        let count = 0;
        for (const provider of this.providers.values()) {
            for await (const _key of provider.list()) {
                count++;
            }
        }
        return count;
    }

    private providerFor(backend: StorageBackend): IStorageProvider {
        const provider = this.providers.get(backend);
        if (!provider) {
            throw new Error(`No storage provider is configured for backend "${backend}"`);
        }
        return provider;
    }

    public async removeStaged(stagedPath: string): Promise<void> {
        try {
            await fs.rm(stagedPath, { force: true });
        } catch (e) {
            this.logger.error(`Failed to remove staged file ${stagedPath}: ${(e as Error).message}`);
        }
    }

    public async sweepStaging(olderThanMs: number): Promise<void> {
        const now = Date.now();
        const stagedFiles = await fs.readdir(stagingDir);

        for (const stagedFile of stagedFiles) {
            const stagedPath = path.join(stagingDir, stagedFile);

            let modifiedAt: number;
            try {
                modifiedAt = (await fs.stat(stagedPath)).mtimeMs;
            } catch (e) {
                if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                    continue;
                }
                throw e;
            }

            if (now - modifiedAt < olderThanMs) {
                continue;
            }

            this.logger.warn(`Removing abandoned staged upload ${stagedFile}`);
            await this.removeStaged(stagedPath);
        }
    }
}
