import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { Logger } from "@tsed/logger";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { GlobalEnv } from "../../model/constants/GlobalEnv.js";
import { StorageOperationError } from "../../model/exceptions/StorageOperationError.js";
import type { FileUploadModel } from "../../model/db/FileUpload.model.js";
import type { LocalStorageProvider } from "../../engine/impl/storage/LocalStorageProvider.js";
import type { S3StorageProvider } from "../../engine/impl/storage/S3StorageProvider.js";
import type { SettingsService } from "../SettingsService.js";
import type { StorageBackend } from "../../utils/typeings.js";
import { StorageService } from "../StorageService.js";

const dirs = vi.hoisted(() => ({ root: "" }));

vi.mock("../../utils/Utils.js", () => ({
    get filesDir(): string {
        return dirs.root;
    },
    get stagingDir(): string {
        return path.join(dirs.root, ".staging");
    },
    getSoftDeleteLocation: (): string | null => null,
}));

type FakeProvider = {
    id: StorageBackend;
    enabled: boolean;
    get: Mock;
    getBuffer: Mock;
    put: Mock;
    putFile: Mock;
    head: Mock;
    delete: Mock;
    softDelete: Mock;
    list: Mock;
};

type FakeLogger = {
    error: Mock;
    warn: Mock;
};

async function* keysOf(keys: string[]): AsyncIterable<string> {
    for (const key of keys) {
        yield key;
    }
}

function createFakeProvider(id: StorageBackend, enabled = true, listed: string[] = []): FakeProvider {
    return {
        id,
        enabled,
        get: vi.fn().mockResolvedValue(Readable.from([Buffer.from(id)])),
        getBuffer: vi.fn().mockResolvedValue(Buffer.from(id)),
        put: vi.fn().mockResolvedValue(undefined),
        putFile: vi.fn().mockResolvedValue(undefined),
        head: vi.fn().mockResolvedValue({ key: "k", size: 1, lastModified: new Date(0) }),
        delete: vi.fn().mockResolvedValue(undefined),
        softDelete: vi.fn().mockResolvedValue(undefined),
        list: vi.fn(() => keysOf(listed)),
    };
}

function createLogger(): FakeLogger {
    return {
        error: vi.fn(),
        warn: vi.fn(),
    };
}

function createService(
    local: FakeProvider,
    s3: FakeProvider,
    configuredBackend: string | null = "local",
    logger: FakeLogger = createLogger(),
): StorageService {
    const settingsService = {
        getSetting: (key: GlobalEnv): string | null => (key === GlobalEnv.STORAGE_BACKEND ? configuredBackend : null),
    } as unknown as SettingsService;
    return new StorageService(
        local as unknown as LocalStorageProvider,
        s3 as unknown as S3StorageProvider,
        settingsService,
        logger as unknown as Logger,
    );
}

function entry(storageBackend: string, fullFileNameOnSystem: string): FileUploadModel {
    return { storageBackend, fullFileNameOnSystem } as unknown as FileUploadModel;
}

describe("StorageService", () => {
    let local: FakeProvider;
    let s3: FakeProvider;

    beforeEach(async () => {
        dirs.root = await fs.mkdtemp(path.join(os.tmpdir(), "wv-storage-service-"));
        local = createFakeProvider("local");
        s3 = createFakeProvider("s3");
    });

    afterEach(async () => {
        await fs.rm(dirs.root, { recursive: true, force: true });
    });

    describe("construction", () => {
        it("always registers local and registers s3 only when the S3 provider is enabled", () => {
            // given
            const disabledS3 = createFakeProvider("s3", false);

            // when
            const withS3 = createService(local, s3);
            const withoutS3 = createService(local, disabledS3);

            // then
            expect(withS3.backends).toEqual(["local", "s3"]);
            expect(withoutS3.backends).toEqual(["local"]);
        });

        it("throws when STORAGE_BACKEND is s3 but S3 is not configured", () => {
            // given
            const disabledS3 = createFakeProvider("s3", false);

            // when
            const construct = (): StorageService => createService(local, disabledS3, "s3");

            // then
            expect(construct).toThrow(/STORAGE_BACKEND is "s3"/);
        });

        it("throws when STORAGE_BACKEND is an unknown value", () => {
            // when
            const construct = (): StorageService => createService(local, s3, "azure");

            // then
            expect(construct).toThrow(/STORAGE_BACKEND is "azure"/);
        });
    });

    describe("commit", () => {
        it("puts the staged file on the local backend when STORAGE_BACKEND is local", async () => {
            // given
            const service = createService(local, s3, "local");

            // when
            const backend = await service.commit("/staging/abc.tmp", entry("s3", "abc.png"));

            // then
            expect(backend).toBe("local");
            expect(local.putFile).toHaveBeenCalledWith("abc.png", "/staging/abc.tmp");
            expect(s3.putFile).not.toHaveBeenCalled();
        });

        it("puts the staged file on s3 when STORAGE_BACKEND is s3", async () => {
            // given
            const service = createService(local, s3, "s3");

            // when
            const backend = await service.commit("/staging/abc.tmp", entry("local", "abc.png"));

            // then
            expect(backend).toBe("s3");
            expect(s3.putFile).toHaveBeenCalledWith("abc.png", "/staging/abc.tmp");
            expect(local.putFile).not.toHaveBeenCalled();
        });

        it("propagates a failed upload instead of reporting a backend", async () => {
            // given
            s3.putFile.mockRejectedValue(new Error("bucket unreachable"));
            const service = createService(local, s3, "s3");

            // when
            const result = service.commit("/staging/abc.tmp", entry("s3", "abc.png"));

            // then
            await expect(result).rejects.toThrow("bucket unreachable");
        });
    });

    describe("routing by entry backend", () => {
        it("opens streams from the provider that holds the entry and forwards the range", async () => {
            // given
            const service = createService(local, s3);
            const range = { start: 2, end: 5 };

            // when
            await service.openStream(entry("local", "a.txt"), range);
            await service.openStream(entry("s3", "b.txt"));

            // then
            expect(local.get).toHaveBeenCalledExactlyOnceWith("a.txt", range);
            expect(s3.get).toHaveBeenCalledExactlyOnceWith("b.txt", undefined);
        });

        it("reads whole objects from the provider that holds the entry", async () => {
            // given
            const service = createService(local, s3);

            // when
            const fromLocal = await service.readAll(entry("local", "a.txt"));
            const fromS3 = await service.readAll(entry("s3", "b.txt"));

            // then
            expect(fromLocal.toString()).toBe("local");
            expect(fromS3.toString()).toBe("s3");
            expect(local.getBuffer).toHaveBeenCalledExactlyOnceWith("a.txt");
            expect(s3.getBuffer).toHaveBeenCalledExactlyOnceWith("b.txt");
        });

        it("writes to the provider that holds the entry regardless of the default backend", async () => {
            // given
            const service = createService(local, s3, "local");
            const body = Buffer.from("new bytes");

            // when
            await service.write(entry("s3", "b.txt"), body);

            // then
            expect(s3.put).toHaveBeenCalledExactlyOnceWith("b.txt", body);
            expect(local.put).not.toHaveBeenCalled();
        });

        it("reports existence from the head of the provider that holds the entry", async () => {
            // given
            s3.head.mockResolvedValue(null);
            const service = createService(local, s3);

            // when
            const localExists = await service.exists(entry("local", "a.txt"));
            const s3Exists = await service.exists(entry("s3", "b.txt"));

            // then
            expect(localExists).toBe(true);
            expect(s3Exists).toBe(false);
            expect(local.head).toHaveBeenCalledWith("a.txt");
            expect(s3.head).toHaveBeenCalledWith("b.txt");
        });

        it("throws for an entry whose backend is not configured", async () => {
            // given
            const service = createService(local, createFakeProvider("s3", false));
            const s3Entry = entry("s3", "b.txt");

            // when
            const open = (): Promise<Readable> => service.openStream(s3Entry);
            const read = (): Promise<Buffer> => service.readAll(s3Entry);
            const write = (): Promise<void> => service.write(s3Entry, Buffer.from("x"));
            const exists = service.exists(s3Entry);

            // then
            expect(open).toThrow('No storage provider is configured for backend "s3"');
            expect(read).toThrow('No storage provider is configured for backend "s3"');
            expect(write).toThrow('No storage provider is configured for backend "s3"');
            await expect(exists).rejects.toThrow('No storage provider is configured for backend "s3"');
            expect(local.get).not.toHaveBeenCalled();
        });
    });

    describe("delete", () => {
        it("groups entries by backend and calls each provider once with its keys", async () => {
            // given
            const service = createService(local, s3);
            const entries = [entry("local", "a.txt"), entry("s3", "b.txt"), entry("local", "c.txt")];

            // when
            await service.delete(entries);

            // then
            expect(local.delete).toHaveBeenCalledExactlyOnceWith(["a.txt", "c.txt"]);
            expect(s3.delete).toHaveBeenCalledExactlyOnceWith(["b.txt"]);
            expect(local.softDelete).not.toHaveBeenCalled();
            expect(s3.softDelete).not.toHaveBeenCalled();
        });

        it("soft deletes on every backend when soft is set", async () => {
            // given
            const service = createService(local, s3);
            const entries = [entry("local", "a.txt"), entry("s3", "b.txt")];

            // when
            await service.delete(entries, true);

            // then
            expect(local.softDelete).toHaveBeenCalledExactlyOnceWith(["a.txt"]);
            expect(s3.softDelete).toHaveBeenCalledExactlyOnceWith(["b.txt"]);
            expect(local.delete).not.toHaveBeenCalled();
            expect(s3.delete).not.toHaveBeenCalled();
        });

        it("still deletes on later backends and aggregates failures from all of them", async () => {
            // given
            const localFailure = new Error("disk locked");
            const s3Failures = [new Error("denied a"), new Error("denied b")];
            local.delete.mockRejectedValue(localFailure);
            s3.delete.mockRejectedValue(new StorageOperationError(s3Failures, "s3 failed"));
            const service = createService(local, s3);

            // when
            const result = service.delete([entry("local", "a.txt"), entry("s3", "b.txt"), entry("s3", "c.txt")]);

            // then
            const error = (await result.catch((e: unknown) => e)) as StorageOperationError;
            expect(error).toBeInstanceOf(StorageOperationError);
            expect(error.failures).toEqual([localFailure, ...s3Failures]);
            expect(error.message).toBe("Failed to delete 3 stored object(s)");
            expect(s3.delete).toHaveBeenCalledExactlyOnceWith(["b.txt", "c.txt"]);
        });

        it("reports an entry on an unconfigured backend as a failure without skipping the others", async () => {
            // given
            const service = createService(local, createFakeProvider("s3", false));

            // when
            const result = service.delete([entry("s3", "b.txt"), entry("local", "a.txt")]);

            // then
            const error = (await result.catch((e: unknown) => e)) as StorageOperationError;
            expect(error).toBeInstanceOf(StorageOperationError);
            expect(error.failures).toHaveLength(1);
            expect(local.delete).toHaveBeenCalledExactlyOnceWith(["a.txt"]);
        });

        it("does nothing for an empty list of entries", async () => {
            // given
            const service = createService(local, s3);

            // when
            await service.delete([]);

            // then
            expect(local.delete).not.toHaveBeenCalled();
            expect(s3.delete).not.toHaveBeenCalled();
        });
    });

    describe("deleteKeys", () => {
        it("does not touch the provider for an empty list of keys", async () => {
            // given
            const service = createService(local, s3);

            // when
            await service.deleteKeys("s3", []);
            await service.deleteKeys("local", [], true);

            // then
            expect(s3.delete).not.toHaveBeenCalled();
            expect(local.softDelete).not.toHaveBeenCalled();
        });

        it("routes keys to the named backend honouring soft", async () => {
            // given
            const service = createService(local, s3);

            // when
            await service.deleteKeys("s3", ["x.txt"]);
            await service.deleteKeys("local", ["y.txt"], true);

            // then
            expect(s3.delete).toHaveBeenCalledExactlyOnceWith(["x.txt"]);
            expect(local.softDelete).toHaveBeenCalledExactlyOnceWith(["y.txt"]);
        });
    });

    describe("countObjects", () => {
        it("sums the listed objects across every registered provider", async () => {
            // given
            const service = createService(
                createFakeProvider("local", true, ["a", "b", "c"]),
                createFakeProvider("s3", true, ["d", "e"]),
            );

            // when
            const count = await service.countObjects();

            // then
            expect(count).toBe(5);
        });

        it("ignores a disabled s3 provider", async () => {
            // given
            const disabledS3 = createFakeProvider("s3", false, ["d", "e"]);
            const service = createService(createFakeProvider("local", true, ["a"]), disabledS3);

            // when
            const count = await service.countObjects();

            // then
            expect(count).toBe(1);
            expect(disabledS3.list).not.toHaveBeenCalled();
        });
    });

    describe("staging", () => {
        it("creates the staging directory on init", async () => {
            // given
            const service = createService(local, s3);

            // when
            await service.$onInit();

            // then
            const stat = await fs.stat(path.join(dirs.root, ".staging"));
            expect(stat.isDirectory()).toBe(true);
        });

        it("removes a staged file and treats a missing one as already removed", async () => {
            // given
            const logger = createLogger();
            const service = createService(local, s3, "local", logger);
            const staged = path.join(dirs.root, "staged.tmp");
            await fs.writeFile(staged, "bytes");

            // when
            await service.removeStaged(staged);
            await service.removeStaged(path.join(dirs.root, "never-existed.tmp"));

            // then
            await expect(fs.access(staged)).rejects.toThrow();
            expect(logger.error).not.toHaveBeenCalled();
        });

        it("logs instead of throwing when a staged path cannot be removed", async () => {
            // given
            const logger = createLogger();
            const service = createService(local, s3, "local", logger);
            const directory = path.join(dirs.root, "not-a-file");
            await fs.mkdir(directory);

            // when
            const result = service.removeStaged(directory);

            // then
            await expect(result).resolves.toBeUndefined();
            expect(logger.error).toHaveBeenCalledOnce();
            expect(logger.error.mock.calls[0][0]).toContain(directory);
        });

        it("sweeps only staged files older than the threshold", async () => {
            // given
            const logger = createLogger();
            const service = createService(local, s3, "local", logger);
            await service.$onInit();
            const stagingPath = path.join(dirs.root, ".staging");
            const oldFile = path.join(stagingPath, "old.tmp");
            const freshFile = path.join(stagingPath, "fresh.tmp");
            await fs.writeFile(oldFile, "old");
            await fs.writeFile(freshFile, "fresh");
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            await fs.utimes(oldFile, twoHoursAgo, twoHoursAgo);

            // when
            await service.sweepStaging(60 * 60 * 1000);

            // then
            await expect(fs.access(oldFile)).rejects.toThrow();
            await expect(fs.access(freshFile)).resolves.toBeUndefined();
            expect(logger.warn).toHaveBeenCalledExactlyOnceWith("Removing abandoned staged upload old.tmp");
        });

        it("does nothing when the staging directory is empty", async () => {
            // given
            const logger = createLogger();
            const service = createService(local, s3, "local", logger);
            await service.$onInit();

            // when
            await service.sweepStaging(0);

            // then
            expect(logger.warn).not.toHaveBeenCalled();
            expect(logger.error).not.toHaveBeenCalled();
        });
    });
});
