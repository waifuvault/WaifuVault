import { Injectable, OnInit, ProviderScope } from "@tsed/di";
import fs from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import type { IStorageProvider } from "../../IStorageProvider.js";
import type { ByteRange, StorageBackend, StoredObjectInfo } from "../../../utils/typeings.js";
import { StorageNotFoundError } from "../../../model/exceptions/StorageNotFoundError.js";
import { StorageOperationError } from "../../../model/exceptions/StorageOperationError.js";
import { filesDir, getSoftDeleteLocation, stagingDir } from "../../../utils/Utils.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
})
export class LocalStorageProvider implements IStorageProvider, OnInit {
    private readonly root = path.resolve(filesDir);
    private readonly stagingName = path.basename(stagingDir);

    public get id(): StorageBackend {
        return "local";
    }

    public async $onInit(): Promise<void> {
        await fs.mkdir(this.root, { recursive: true });
    }

    public async get(key: string, range?: ByteRange): Promise<Readable> {
        const filePath = this.resolve(key);

        let handle: fs.FileHandle;
        try {
            handle = await fs.open(filePath, "r");
        } catch (e) {
            throw this.mapError(e, key);
        }

        const stream = handle.createReadStream(range);
        stream.on("error", () => {
            stream.destroy();
        });

        return stream;
    }

    public async getBuffer(key: string): Promise<Buffer> {
        try {
            return await fs.readFile(this.resolve(key));
        } catch (e) {
            throw this.mapError(e, key);
        }
    }

    public async put(key: string, body: Buffer): Promise<void> {
        await fs.writeFile(this.resolve(key), body);
    }

    public async putFile(key: string, localPath: string): Promise<void> {
        const destination = this.resolve(key);

        try {
            await fs.rename(localPath, destination);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "EXDEV") {
                throw e;
            }
            await fs.copyFile(localPath, destination);
            await fs.rm(localPath, { force: true });
        }
    }

    public async head(key: string): Promise<StoredObjectInfo | null> {
        try {
            const stat = await fs.stat(this.resolve(key));
            return {
                key,
                size: stat.size,
                lastModified: stat.mtime,
            };
        } catch (e) {
            if (this.isNotFound(e)) {
                return null;
            }
            throw e;
        }
    }

    public async delete(keys: string[]): Promise<void> {
        const results = await Promise.allSettled(
            keys.map(key => fs.rm(this.resolve(key), { recursive: true, force: true })),
        );

        this.throwOnFailures(results, "delete");
    }

    public async softDelete(keys: string[]): Promise<void> {
        const softDeleteLocation = getSoftDeleteLocation();
        if (!softDeleteLocation) {
            return this.delete(keys);
        }

        const results = await Promise.allSettled(
            keys.map(key => this.moveIgnoringMissing(this.resolve(key), path.join(softDeleteLocation, key))),
        );

        this.throwOnFailures(results, "soft delete");
    }

    public async *list(): AsyncIterable<string> {
        const dir = await fs.opendir(this.root);
        for await (const entry of dir) {
            if (entry.name === this.stagingName) {
                continue;
            }
            yield entry.name;
        }
    }

    private async moveIgnoringMissing(source: string, destination: string): Promise<void> {
        try {
            await fs.rename(source, destination);
        } catch (e) {
            if (!this.isNotFound(e)) {
                throw e;
            }
        }
    }

    private resolve(key: string): string {
        const resolved = path.resolve(this.root, key);
        if (path.dirname(resolved) !== this.root) {
            throw new Error(`Invalid storage key ${key}`);
        }
        return resolved;
    }

    private throwOnFailures(results: PromiseSettledResult<void>[], operation: string): void {
        const failures: unknown[] = [];
        for (const result of results) {
            if (result.status === "rejected") {
                failures.push(result.reason);
            }
        }

        if (failures.length > 0) {
            throw new StorageOperationError(failures, `Failed to ${operation} ${failures.length} stored object(s)`);
        }
    }

    private isNotFound(e: unknown): boolean {
        return (e as NodeJS.ErrnoException).code === "ENOENT";
    }

    private mapError(e: unknown, key: string): unknown {
        return this.isNotFound(e) ? new StorageNotFoundError(key) : e;
    }
}
