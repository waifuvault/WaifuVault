import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/platform-http/testing";
import { Logger } from "@tsed/logger";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { StorageOperationError } from "../../model/exceptions/StorageOperationError.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { StorageProviderManager } from "../../manager/StorageProviderManager.js";
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
    const localEngine = {
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
    const s3Engine = {
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
    const managerMock = {
        engineFor: vi.fn(),
        activeEngine: localEngine,
        backends: ["local", "s3"],
        engines: [localEngine, s3Engine],
    };
    const logger = { error: vi.fn(), warn: vi.fn() };
    let service: StorageService;

    beforeEach(async () => {
        dirs.root = await fs.mkdtemp(path.join(os.tmpdir(), "wv-storage-service-"));

        await PlatformTest.create({
            imports: [{ token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } }],
        });
        vi.resetAllMocks();

        managerMock.activeEngine = localEngine;
        managerMock.backends = ["local", "s3"];
        managerMock.engines = [localEngine, s3Engine];
        managerMock.engineFor.mockImplementation((backend: string) => {
            const engine = managerMock.engines.find(candidate => candidate.id === backend);
            if (!engine) {
                throw new Error(`No storage engine is enabled for backend "${backend}"`);
            }
            return engine;
        });
        for (const engine of [localEngine, s3Engine]) {
            engine.get.mockImplementation(() => Promise.resolve(Readable.from([Buffer.from(engine.id)])));
            engine.getBuffer.mockImplementation(() => Promise.resolve(Buffer.from(engine.id)));
            engine.put.mockResolvedValue(undefined);
            engine.putFile.mockResolvedValue(undefined);
            engine.head.mockResolvedValue({ key: "k", size: 1, lastModified: new Date(0) });
            engine.delete.mockResolvedValue(undefined);
            engine.softDelete.mockResolvedValue(undefined);
            engine.list.mockImplementation(() => keysOf([]));
        }

        service = await PlatformTest.invoke<StorageService>(StorageService, [
            { token: StorageProviderManager, use: managerMock },
            { token: Logger, use: logger },
        ]);
    });

    afterEach(async () => {
        await PlatformTest.reset();
        await fs.rm(dirs.root, { recursive: true, force: true });
    });

    describe("backends", () => {
        it("exposes the backends of the enabled engines from the manager", () => {
            // given
            managerMock.backends = ["local"];

            // when
            const backends = service.backends;

            // then
            expect(backends).toEqual(["local"]);
        });
    });

    describe("commit", () => {
        it("puts the staged file on the active engine and returns its id", async () => {
            // given
            const entry = makeEntry("s3", "abc", "png");

            // when
            const backend = await service.commit("/staging/abc.tmp", entry);

            // then
            expect(backend).toBe("local");
            expect(localEngine.putFile).toHaveBeenCalledWith("abc.png", "/staging/abc.tmp");
            expect(s3Engine.putFile).not.toHaveBeenCalled();
        });

        it("puts the staged file on s3 when s3 is the active engine", async () => {
            // given
            managerMock.activeEngine = s3Engine;
            const entry = makeEntry("local", "abc", "png");

            // when
            const backend = await service.commit("/staging/abc.tmp", entry);

            // then
            expect(backend).toBe("s3");
            expect(s3Engine.putFile).toHaveBeenCalledWith("abc.png", "/staging/abc.tmp");
            expect(localEngine.putFile).not.toHaveBeenCalled();
        });

        it("propagates a failed upload instead of reporting a backend", async () => {
            // given
            managerMock.activeEngine = s3Engine;
            s3Engine.putFile.mockRejectedValue(new Error("bucket unreachable"));

            // when
            const result = service.commit("/staging/abc.tmp", makeEntry("s3", "abc", "png"));

            // then
            await expect(result).rejects.toThrow("bucket unreachable");
        });
    });

    describe("routing by entry backend", () => {
        it("opens streams from the engine that holds the entry and forwards the range", async () => {
            // given
            const range = { start: 2, end: 5 };

            // when
            await service.openStream(makeEntry("local", "a", "txt"), range);
            await service.openStream(makeEntry("s3", "b", "txt"));

            // then
            expect(managerMock.engineFor).toHaveBeenCalledWith("local");
            expect(managerMock.engineFor).toHaveBeenCalledWith("s3");
            expect(localEngine.get).toHaveBeenCalledExactlyOnceWith("a.txt", range);
            expect(s3Engine.get).toHaveBeenCalledExactlyOnceWith("b.txt", undefined);
        });

        it("reads whole objects from the engine that holds the entry", async () => {
            // given
            const localEntry = makeEntry("local", "a", "txt");
            const s3Entry = makeEntry("s3", "b", "txt");

            // when
            const fromLocal = await service.readAll(localEntry);
            const fromS3 = await service.readAll(s3Entry);

            // then
            expect(fromLocal.toString()).toBe("local");
            expect(fromS3.toString()).toBe("s3");
            expect(localEngine.getBuffer).toHaveBeenCalledExactlyOnceWith("a.txt");
            expect(s3Engine.getBuffer).toHaveBeenCalledExactlyOnceWith("b.txt");
        });

        it("writes to the engine that holds the entry regardless of the active engine", async () => {
            // given
            const body = Buffer.from("new bytes");

            // when
            await service.write(makeEntry("s3", "b", "txt"), body);

            // then
            expect(s3Engine.put).toHaveBeenCalledExactlyOnceWith("b.txt", body);
            expect(localEngine.put).not.toHaveBeenCalled();
        });

        it("reports existence from the head of the engine that holds the entry", async () => {
            // given
            s3Engine.head.mockResolvedValue(null);

            // when
            const localExists = await service.exists(makeEntry("local", "a", "txt"));
            const s3Exists = await service.exists(makeEntry("s3", "b", "txt"));

            // then
            expect(localExists).toBe(true);
            expect(s3Exists).toBe(false);
            expect(localEngine.head).toHaveBeenCalledWith("a.txt");
            expect(s3Engine.head).toHaveBeenCalledWith("b.txt");
        });

        it("propagates the manager error for an entry whose backend has no enabled engine", async () => {
            // given
            managerMock.engines = [localEngine];
            const s3Entry = makeEntry("s3", "b", "txt");

            // when
            const open = (): Promise<Readable> => service.openStream(s3Entry);
            const read = (): Promise<Buffer> => service.readAll(s3Entry);
            const write = (): Promise<void> => service.write(s3Entry, Buffer.from("x"));
            const exists = service.exists(s3Entry);

            // then
            expect(open).toThrow('No storage engine is enabled for backend "s3"');
            expect(read).toThrow('No storage engine is enabled for backend "s3"');
            expect(write).toThrow('No storage engine is enabled for backend "s3"');
            await expect(exists).rejects.toThrow('No storage engine is enabled for backend "s3"');
            expect(localEngine.get).not.toHaveBeenCalled();
            expect(s3Engine.get).not.toHaveBeenCalled();
        });
    });

    describe("delete", () => {
        it("groups entries by backend and calls each engine once with its keys", async () => {
            // given
            const entries = [
                makeEntry("local", "a", "txt"),
                makeEntry("s3", "b", "txt"),
                makeEntry("local", "c", "txt"),
            ];

            // when
            await service.delete(entries);

            // then
            expect(localEngine.delete).toHaveBeenCalledExactlyOnceWith(["a.txt", "c.txt"]);
            expect(s3Engine.delete).toHaveBeenCalledExactlyOnceWith(["b.txt"]);
            expect(localEngine.softDelete).not.toHaveBeenCalled();
            expect(s3Engine.softDelete).not.toHaveBeenCalled();
        });

        it("soft deletes on every backend when soft is set", async () => {
            // given
            const entries = [makeEntry("local", "a", "txt"), makeEntry("s3", "b", "txt")];

            // when
            await service.delete(entries, true);

            // then
            expect(localEngine.softDelete).toHaveBeenCalledExactlyOnceWith(["a.txt"]);
            expect(s3Engine.softDelete).toHaveBeenCalledExactlyOnceWith(["b.txt"]);
            expect(localEngine.delete).not.toHaveBeenCalled();
            expect(s3Engine.delete).not.toHaveBeenCalled();
        });

        it("still deletes on later backends and aggregates failures from all of them", async () => {
            // given
            const localFailure = new Error("disk locked");
            const s3Failures = [new Error("denied a"), new Error("denied b")];
            localEngine.delete.mockRejectedValue(localFailure);
            s3Engine.delete.mockRejectedValue(new StorageOperationError(s3Failures, "s3 failed"));

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
            expect(s3Engine.delete).toHaveBeenCalledExactlyOnceWith(["b.txt", "c.txt"]);
        });

        it("reports an entry on a backend with no enabled engine as a failure without skipping the others", async () => {
            // given
            managerMock.engines = [localEngine];

            // when
            const result = service.delete([makeEntry("s3", "b", "txt"), makeEntry("local", "a", "txt")]);

            // then
            await expect(result).rejects.toBeInstanceOf(StorageOperationError);
            await expect(result).rejects.toHaveProperty("failures", [expect.any(Error)]);
            expect(localEngine.delete).toHaveBeenCalledExactlyOnceWith(["a.txt"]);
        });

        it("does nothing for an empty list of entries", async () => {
            // given
            const entries: FileUploadModel[] = [];

            // when
            await service.delete(entries);

            // then
            expect(managerMock.engineFor).not.toHaveBeenCalled();
            expect(localEngine.delete).not.toHaveBeenCalled();
            expect(s3Engine.delete).not.toHaveBeenCalled();
        });
    });

    describe("deleteKeys", () => {
        it("does not touch the engine for an empty list of keys", async () => {
            // given
            const keys: string[] = [];

            // when
            await service.deleteKeys("s3", keys);
            await service.deleteKeys("local", keys, true);

            // then
            expect(managerMock.engineFor).not.toHaveBeenCalled();
            expect(s3Engine.delete).not.toHaveBeenCalled();
            expect(localEngine.softDelete).not.toHaveBeenCalled();
        });

        it("routes keys to the named backend honouring soft", async () => {
            // given
            const hardKeys = ["x.txt"];
            const softKeys = ["y.txt"];

            // when
            await service.deleteKeys("s3", hardKeys);
            await service.deleteKeys("local", softKeys, true);

            // then
            expect(s3Engine.delete).toHaveBeenCalledExactlyOnceWith(["x.txt"]);
            expect(localEngine.softDelete).toHaveBeenCalledExactlyOnceWith(["y.txt"]);
        });
    });

    describe("headKey", () => {
        it("heads the key on the named backend", async () => {
            // given
            const info = { key: "x.txt", size: 9, lastModified: new Date(1) };
            s3Engine.head.mockResolvedValue(info);

            // when
            const result = await service.headKey("s3", "x.txt");

            // then
            expect(result).toBe(info);
            expect(s3Engine.head).toHaveBeenCalledExactlyOnceWith("x.txt");
            expect(localEngine.head).not.toHaveBeenCalled();
        });
    });

    describe("listKeys", () => {
        it("lists the keys of the named backend", async () => {
            // given
            s3Engine.list.mockImplementation(() => keysOf(["d", "e"]));
            const keys: string[] = [];

            // when
            for await (const key of service.listKeys("s3")) {
                keys.push(key);
            }

            // then
            expect(keys).toEqual(["d", "e"]);
            expect(localEngine.list).not.toHaveBeenCalled();
        });
    });

    describe("countObjects", () => {
        it("sums the listed objects across every engine the manager holds", async () => {
            // given
            localEngine.list.mockImplementation(() => keysOf(["a", "b", "c"]));
            s3Engine.list.mockImplementation(() => keysOf(["d", "e"]));

            // when
            const count = await service.countObjects();

            // then
            expect(count).toBe(5);
        });

        it("only counts the engines the manager holds", async () => {
            // given
            managerMock.engines = [localEngine];
            localEngine.list.mockImplementation(() => keysOf(["a"]));
            s3Engine.list.mockImplementation(() => keysOf(["d", "e"]));

            // when
            const count = await service.countObjects();

            // then
            expect(count).toBe(1);
            expect(s3Engine.list).not.toHaveBeenCalled();
        });
    });

    describe("staging", () => {
        it("creates the staging directory on init", async () => {
            // given
            const stagingPath = path.join(dirs.root, ".staging");

            // when
            const stat = await fs.stat(stagingPath);

            // then
            expect(stat.isDirectory()).toBe(true);
        });

        it("removes a staged file and treats a missing one as already removed", async () => {
            // given
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
            const olderThanMs = 0;

            // when
            await service.sweepStaging(olderThanMs);

            // then
            expect(logger.warn).not.toHaveBeenCalled();
            expect(logger.error).not.toHaveBeenCalled();
        });
    });
});
