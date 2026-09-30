import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/platform-http/testing";
import { Logger } from "@tsed/logger";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { GlobalEnv } from "../../model/constants/GlobalEnv.js";
import { StorageOperationError } from "../../model/exceptions/StorageOperationError.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { LocalStorageProvider } from "../../engine/impl/storage/LocalStorageProvider.js";
import { S3StorageProvider } from "../../engine/impl/storage/S3StorageProvider.js";
import { SettingsService } from "../SettingsService.js";
import { StorageService } from "../StorageService.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";

const dirs = vi.hoisted(() => ({ root: "" }));

vi.mock("../../db/DataSource.js", () => ({ dataSource: {} }));

vi.mock(import("../../utils/Utils.js"), async importOriginal => ({
    ...(await importOriginal()),
    get filesDir(): string {
        return dirs.root;
    },
    get stagingDir(): string {
        return path.join(dirs.root, ".staging");
    },
}));

async function* keysOf(keys: string[]): AsyncIterable<string> {
    for (const key of keys) {
        yield key;
    }
}

function makeEntry(storageBackend: string, fileName: string, fileExtension: string): FileUploadModel {
    return Object.assign(new FileUploadModel(), { storageBackend, fileName, fileExtension });
}

describe("StorageService", () => {
    const local = {
        id: "local",
        enabled: true,
        get: vi.fn(),
        getBuffer: vi.fn(),
        put: vi.fn(),
        putFile: vi.fn(),
        head: vi.fn(),
        delete: vi.fn(),
        softDelete: vi.fn(),
        list: vi.fn(),
    };
    const s3 = {
        id: "s3",
        enabled: true,
        get: vi.fn(),
        getBuffer: vi.fn(),
        put: vi.fn(),
        putFile: vi.fn(),
        head: vi.fn(),
        delete: vi.fn(),
        softDelete: vi.fn(),
        list: vi.fn(),
    };
    const settingsService = { getSetting: vi.fn() };
    const logger = { error: vi.fn(), warn: vi.fn() };
    const collaborators = [
        { token: LocalStorageProvider, use: local },
        { token: S3StorageProvider, use: s3 },
        { token: SettingsService, use: settingsService },
        { token: Logger, use: logger },
    ];
    let configuredBackend: string | null;

    beforeEach(async () => {
        dirs.root = await fs.mkdtemp(path.join(os.tmpdir(), "wv-storage-service-"));

        await PlatformTest.create({
            imports: [{ token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } }],
        });
        vi.resetAllMocks();

        configuredBackend = "local";
        s3.enabled = true;
        settingsService.getSetting.mockImplementation((key: GlobalEnv) =>
            key === GlobalEnv.STORAGE_BACKEND ? configuredBackend : null,
        );
        for (const provider of [local, s3]) {
            provider.get.mockImplementation(() => Promise.resolve(Readable.from([Buffer.from(provider.id)])));
            provider.getBuffer.mockImplementation(() => Promise.resolve(Buffer.from(provider.id)));
            provider.put.mockResolvedValue(undefined);
            provider.putFile.mockResolvedValue(undefined);
            provider.head.mockResolvedValue({ key: "k", size: 1, lastModified: new Date(0) });
            provider.delete.mockResolvedValue(undefined);
            provider.softDelete.mockResolvedValue(undefined);
            provider.list.mockImplementation(() => keysOf([]));
        }
    });

    afterEach(async () => {
        await PlatformTest.reset();
        await fs.rm(dirs.root, { recursive: true, force: true });
    });

    describe("construction", () => {
        it("always registers local and registers s3 only when the S3 provider is enabled", async () => {
            // given
            const withS3 = await PlatformTest.invoke<StorageService>(StorageService, collaborators);
            s3.enabled = false;

            // when
            const withoutS3 = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // then
            expect(withS3.backends).toEqual(["local", "s3"]);
            expect(withoutS3.backends).toEqual(["local"]);
        });

        it("throws when STORAGE_BACKEND is s3 but S3 is not configured", async () => {
            // given
            s3.enabled = false;
            configuredBackend = "s3";

            // when
            const result = PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // then
            await expect(result).rejects.toThrow(/STORAGE_BACKEND is "s3"/);
        });

        it("throws when STORAGE_BACKEND is an unknown value", async () => {
            // given
            configuredBackend = "azure";

            // when
            const result = PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // then
            await expect(result).rejects.toThrow(/STORAGE_BACKEND is "azure"/);
        });
    });

    describe("commit", () => {
        it("puts the staged file on the local backend when STORAGE_BACKEND is local", async () => {
            // given
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            const backend = await service.commit("/staging/abc.tmp", makeEntry("s3", "abc", "png"));

            // then
            expect(backend).toBe("local");
            expect(local.putFile).toHaveBeenCalledWith("abc.png", "/staging/abc.tmp");
            expect(s3.putFile).not.toHaveBeenCalled();
        });

        it("puts the staged file on s3 when STORAGE_BACKEND is s3", async () => {
            // given
            configuredBackend = "s3";
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            const backend = await service.commit("/staging/abc.tmp", makeEntry("local", "abc", "png"));

            // then
            expect(backend).toBe("s3");
            expect(s3.putFile).toHaveBeenCalledWith("abc.png", "/staging/abc.tmp");
            expect(local.putFile).not.toHaveBeenCalled();
        });

        it("propagates a failed upload instead of reporting a backend", async () => {
            // given
            configuredBackend = "s3";
            s3.putFile.mockRejectedValue(new Error("bucket unreachable"));
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            const result = service.commit("/staging/abc.tmp", makeEntry("s3", "abc", "png"));

            // then
            await expect(result).rejects.toThrow("bucket unreachable");
        });
    });

    describe("routing by entry backend", () => {
        it("opens streams from the provider that holds the entry and forwards the range", async () => {
            // given
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);
            const range = { start: 2, end: 5 };

            // when
            await service.openStream(makeEntry("local", "a", "txt"), range);
            await service.openStream(makeEntry("s3", "b", "txt"));

            // then
            expect(local.get).toHaveBeenCalledExactlyOnceWith("a.txt", range);
            expect(s3.get).toHaveBeenCalledExactlyOnceWith("b.txt", undefined);
        });

        it("reads whole objects from the provider that holds the entry", async () => {
            // given
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            const fromLocal = await service.readAll(makeEntry("local", "a", "txt"));
            const fromS3 = await service.readAll(makeEntry("s3", "b", "txt"));

            // then
            expect(fromLocal.toString()).toBe("local");
            expect(fromS3.toString()).toBe("s3");
            expect(local.getBuffer).toHaveBeenCalledExactlyOnceWith("a.txt");
            expect(s3.getBuffer).toHaveBeenCalledExactlyOnceWith("b.txt");
        });

        it("writes to the provider that holds the entry regardless of the default backend", async () => {
            // given
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);
            const body = Buffer.from("new bytes");

            // when
            await service.write(makeEntry("s3", "b", "txt"), body);

            // then
            expect(s3.put).toHaveBeenCalledExactlyOnceWith("b.txt", body);
            expect(local.put).not.toHaveBeenCalled();
        });

        it("reports existence from the head of the provider that holds the entry", async () => {
            // given
            s3.head.mockResolvedValue(null);
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            const localExists = await service.exists(makeEntry("local", "a", "txt"));
            const s3Exists = await service.exists(makeEntry("s3", "b", "txt"));

            // then
            expect(localExists).toBe(true);
            expect(s3Exists).toBe(false);
            expect(local.head).toHaveBeenCalledWith("a.txt");
            expect(s3.head).toHaveBeenCalledWith("b.txt");
        });

        it("throws for an entry whose backend is not configured", async () => {
            // given
            s3.enabled = false;
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);
            const s3Entry = makeEntry("s3", "b", "txt");

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
            expect(s3.get).not.toHaveBeenCalled();
        });
    });

    describe("delete", () => {
        it("groups entries by backend and calls each provider once with its keys", async () => {
            // given
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);
            const entries = [
                makeEntry("local", "a", "txt"),
                makeEntry("s3", "b", "txt"),
                makeEntry("local", "c", "txt"),
            ];

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
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);
            const entries = [makeEntry("local", "a", "txt"), makeEntry("s3", "b", "txt")];

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
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            const result = service.delete([
                makeEntry("local", "a", "txt"),
                makeEntry("s3", "b", "txt"),
                makeEntry("s3", "c", "txt"),
            ]);

            // then
            await expect(result).rejects.toBeInstanceOf(StorageOperationError);
            await expect(result).rejects.toMatchObject({
                failures: [localFailure, ...s3Failures],
                message: "Failed to delete 3 stored object(s)",
            });
            expect(s3.delete).toHaveBeenCalledExactlyOnceWith(["b.txt", "c.txt"]);
        });

        it("reports an entry on an unconfigured backend as a failure without skipping the others", async () => {
            // given
            s3.enabled = false;
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            const result = service.delete([makeEntry("s3", "b", "txt"), makeEntry("local", "a", "txt")]);

            // then
            await expect(result).rejects.toBeInstanceOf(StorageOperationError);
            await expect(result).rejects.toHaveProperty("failures", [expect.any(Error)]);
            expect(local.delete).toHaveBeenCalledExactlyOnceWith(["a.txt"]);
        });

        it("does nothing for an empty list of entries", async () => {
            // given
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

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
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            await service.deleteKeys("s3", []);
            await service.deleteKeys("local", [], true);

            // then
            expect(s3.delete).not.toHaveBeenCalled();
            expect(local.softDelete).not.toHaveBeenCalled();
        });

        it("routes keys to the named backend honouring soft", async () => {
            // given
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

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
            local.list.mockImplementation(() => keysOf(["a", "b", "c"]));
            s3.list.mockImplementation(() => keysOf(["d", "e"]));
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            const count = await service.countObjects();

            // then
            expect(count).toBe(5);
        });

        it("ignores a disabled s3 provider", async () => {
            // given
            s3.enabled = false;
            local.list.mockImplementation(() => keysOf(["a"]));
            s3.list.mockImplementation(() => keysOf(["d", "e"]));
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            const count = await service.countObjects();

            // then
            expect(count).toBe(1);
            expect(s3.list).not.toHaveBeenCalled();
        });
    });

    describe("staging", () => {
        it("creates the staging directory on init", async () => {
            // given
            const stagingPath = path.join(dirs.root, ".staging");

            // when
            await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // then
            const stat = await fs.stat(stagingPath);
            expect(stat.isDirectory()).toBe(true);
        });

        it("removes a staged file and treats a missing one as already removed", async () => {
            // given
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);
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
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);
            const directory = path.join(dirs.root, "not-a-file");
            await fs.mkdir(directory);

            // when
            const result = service.removeStaged(directory);

            // then
            await expect(result).resolves.toBeUndefined();
            expect(logger.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(directory));
        });

        it("sweeps only staged files older than the threshold", async () => {
            // given
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);
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
            const service = await PlatformTest.invoke<StorageService>(StorageService, collaborators);

            // when
            await service.sweepStaging(0);

            // then
            expect(logger.warn).not.toHaveBeenCalled();
            expect(logger.error).not.toHaveBeenCalled();
        });
    });
});
