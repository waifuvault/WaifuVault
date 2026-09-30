import { Inject, OnInit, Service } from "@tsed/di";
import { Logger } from "@tsed/logger";
import fs from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import type { IStorageProvider } from "../engine/IStorageProvider.js";
import type { ByteRange, StoredObjectInfo } from "../utils/typeings.js";
import { LocalStorageProvider } from "../engine/impl/index.js";
import { stagingDir } from "../utils/Utils.js";

@Service()
export class StorageService implements OnInit {
    private readonly provider: IStorageProvider;

    public constructor(
        @Inject() localStorageProvider: LocalStorageProvider,
        @Inject() private logger: Logger,
    ) {
        this.provider = localStorageProvider;
    }

    public async $onInit(): Promise<void> {
        await fs.mkdir(stagingDir, { recursive: true });
    }

    public openStream(entry: FileUploadModel, range?: ByteRange): Promise<Readable> {
        return this.provider.get(entry.fullFileNameOnSystem, range);
    }

    public readAll(entry: FileUploadModel): Promise<Buffer> {
        return this.provider.getBuffer(entry.fullFileNameOnSystem);
    }

    public write(entry: FileUploadModel, body: Buffer): Promise<void> {
        return this.provider.put(entry.fullFileNameOnSystem, body);
    }

    public commit(stagedPath: string, entry: FileUploadModel): Promise<void> {
        return this.provider.putFile(entry.fullFileNameOnSystem, stagedPath);
    }

    public async exists(entry: FileUploadModel): Promise<boolean> {
        const info = await this.provider.head(entry.fullFileNameOnSystem);
        return info !== null;
    }

    public delete(entries: FileUploadModel[], soft = false): Promise<void> {
        return this.deleteKeys(
            entries.map(entry => entry.fullFileNameOnSystem),
            soft,
        );
    }

    public deleteKeys(keys: string[], soft = false): Promise<void> {
        if (keys.length === 0) {
            return Promise.resolve();
        }
        return soft ? this.provider.softDelete(keys) : this.provider.delete(keys);
    }

    public headKey(key: string): Promise<StoredObjectInfo | null> {
        return this.provider.head(key);
    }

    public listKeys(): AsyncIterable<string> {
        return this.provider.list();
    }

    public async countObjects(): Promise<number> {
        let count = 0;
        for await (const _key of this.provider.list()) {
            count++;
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
