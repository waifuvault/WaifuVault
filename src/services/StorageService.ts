import { Inject, OnInit, Service } from "@tsed/di";
import { Logger } from "@tsed/logger";
import fs from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import type { ByteRange, StorageBackend, StoredObjectInfo } from "../utils/typeings.js";
import { StorageOperationError } from "../model/exceptions/StorageOperationError.js";
import { StorageProviderManager } from "../manager/StorageProviderManager.js";
import { stagingDir } from "../utils/Utils.js";

@Service()
export class StorageService implements OnInit {
    public constructor(
        @Inject() private storageProviderManager: StorageProviderManager,
        @Inject() private logger: Logger,
    ) {}

    public async $onInit(): Promise<void> {
        await fs.mkdir(stagingDir, { recursive: true });
    }

    public get backends(): StorageBackend[] {
        return this.storageProviderManager.backends;
    }

    public openStream(entry: FileUploadModel, range?: ByteRange): Promise<Readable> {
        return this.storageProviderManager.engineFor(entry.storageBackend).get(entry.fullFileNameOnSystem, range);
    }

    public readAll(entry: FileUploadModel): Promise<Buffer> {
        return this.storageProviderManager.engineFor(entry.storageBackend).getBuffer(entry.fullFileNameOnSystem);
    }

    public write(entry: FileUploadModel, body: Buffer): Promise<void> {
        return this.storageProviderManager.engineFor(entry.storageBackend).put(entry.fullFileNameOnSystem, body);
    }

    public async commit(stagedPath: string, entry: FileUploadModel): Promise<StorageBackend> {
        const engine = this.storageProviderManager.activeEngine;
        await engine.putFile(entry.fullFileNameOnSystem, stagedPath);
        return engine.id;
    }

    public async exists(entry: FileUploadModel): Promise<boolean> {
        const info = await this.storageProviderManager.engineFor(entry.storageBackend).head(entry.fullFileNameOnSystem);
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
        const engine = this.storageProviderManager.engineFor(backend);
        return soft ? engine.softDelete(keys) : engine.delete(keys);
    }

    public headKey(backend: StorageBackend, key: string): Promise<StoredObjectInfo | null> {
        return this.storageProviderManager.engineFor(backend).head(key);
    }

    public listKeys(backend: StorageBackend): AsyncIterable<string> {
        return this.storageProviderManager.engineFor(backend).list();
    }

    public async countObjects(): Promise<number> {
        let count = 0;
        for (const engine of this.storageProviderManager.engines) {
            for await (const _key of engine.list()) {
                count++;
            }
        }
        return count;
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
