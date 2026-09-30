import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/platform-http/testing";
import { Logger } from "@tsed/logger";
import { FileCleaner } from "../FileCleaner.js";
import { FileRepo } from "../../db/repo/FileRepo.js";
import { FileService } from "../FileService.js";
import { StorageService } from "../StorageService.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import type { StorageBackend } from "../../utils/typeings.js";

vi.mock("../../db/DataSource.js", () => ({ dataSource: {} }));

const syncGraceMs = 5 * 60 * 1000;
const stagingGraceMs = 60 * 60 * 1000;

function makeEntry(token: string, fileName: string, storageBackend: StorageBackend): FileUploadModel {
    const [name, extension] = fileName.split(".");
    return Object.assign(new FileUploadModel(), {
        token,
        fileName: name,
        fileExtension: extension,
        storageBackend,
    });
}

describe("FileCleaner", () => {
    const repo = { getExpiredFiles: vi.fn(), getAllEntries: vi.fn(), removeDuplicates: vi.fn() };
    const fileService = { processDelete: vi.fn() };
    const logger = { error: vi.fn() };
    const storageService = {
        backends: new Array<StorageBackend>(),
        listKeys: vi.fn(),
        headKey: vi.fn(),
        deleteKeys: vi.fn(),
        sweepStaging: vi.fn(),
    };
    let cleaner: FileCleaner;

    function givenStorage(
        listing: Partial<Record<StorageBackend, string[] | Error>>,
        modified: Record<string, Date> = {},
    ): void {
        storageService.backends = Object.keys(listing).filter(
            (backend): backend is StorageBackend => backend === "local" || backend === "s3",
        );

        storageService.listKeys.mockImplementation(async function* (backend: StorageBackend) {
            const keys = listing[backend];
            if (keys instanceof Error) {
                throw keys;
            }
            for (const key of keys ?? []) {
                yield key;
            }
        });

        storageService.headKey.mockImplementation((_backend: StorageBackend, key: string) =>
            Promise.resolve({
                key,
                size: 1,
                lastModified: modified[key] ?? new Date(Date.now() - syncGraceMs * 2),
            }),
        );
    }

    function givenEntries(firstSnapshot: FileUploadModel[], secondSnapshot: FileUploadModel[] = firstSnapshot): void {
        repo.getAllEntries.mockResolvedValueOnce(firstSnapshot).mockResolvedValue(secondSnapshot);
    }

    beforeEach(async () => {
        await PlatformTest.create({
            imports: [{ token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } }],
        });
        vi.resetAllMocks();
        vi.stubEnv("NODE_APP_INSTANCE", "0");
        repo.getExpiredFiles.mockResolvedValue([]);
        repo.removeDuplicates.mockResolvedValue([]);
        fileService.processDelete.mockResolvedValue(true);
        storageService.deleteKeys.mockResolvedValue(undefined);
        storageService.sweepStaging.mockResolvedValue(undefined);
        repo.getAllEntries.mockResolvedValue([]);
        givenStorage({});

        cleaner = await PlatformTest.invoke<FileCleaner>(FileCleaner, [
            { token: FileRepo, use: repo },
            { token: FileService, use: fileService },
            { token: Logger, use: logger },
            { token: StorageService, use: storageService },
        ]);
    });

    afterEach(PlatformTest.reset);

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe("processFiles", () => {
        it("deletes the tokens of expired entries", async () => {
            // given
            repo.getExpiredFiles.mockResolvedValue([makeEntry("a", "a.png", "local"), makeEntry("b", "b.png", "s3")]);

            // when
            await cleaner.processFiles();

            // then
            expect(fileService.processDelete).toHaveBeenCalledTimes(1);
            expect(fileService.processDelete).toHaveBeenCalledWith(["a", "b"]);
        });

        it("does nothing when no entries have expired", async () => {
            // when
            await cleaner.processFiles();

            // then
            expect(fileService.processDelete).not.toHaveBeenCalled();
        });
    });

    describe("$onReady", () => {
        it("does nothing when this instance is not the scheduler leader", async () => {
            // given
            vi.stubEnv("NODE_APP_INSTANCE", "1");
            givenStorage({ local: ["orphan.png"] });

            // when
            await cleaner.$onReady();

            // then
            expect(repo.getExpiredFiles).not.toHaveBeenCalled();
            expect(repo.getAllEntries).not.toHaveBeenCalled();
            expect(repo.removeDuplicates).not.toHaveBeenCalled();
            expect(storageService.listKeys).not.toHaveBeenCalled();
            expect(storageService.sweepStaging).not.toHaveBeenCalled();
            expect(fileService.processDelete).not.toHaveBeenCalled();
        });

        it("soft-deletes old orphaned objects on their own backend only", async () => {
            // given
            givenStorage({ local: ["local-orphan.png"], s3: ["s3-orphan.png"] });

            // when
            await cleaner.$onReady();

            // then
            expect(storageService.deleteKeys).toHaveBeenCalledTimes(2);
            expect(storageService.deleteKeys).toHaveBeenCalledWith("local", ["local-orphan.png"], true);
            expect(storageService.deleteKeys).toHaveBeenCalledWith("s3", ["s3-orphan.png"], true);
            expect(storageService.headKey).toHaveBeenCalledWith("local", "local-orphan.png");
            expect(storageService.headKey).toHaveBeenCalledWith("s3", "s3-orphan.png");
            expect(logger.error).not.toHaveBeenCalled();
        });

        it("keeps orphaned objects modified within the grace period", async () => {
            // given
            givenStorage({ s3: ["fresh.png", "stale.png"] }, { "fresh.png": new Date(Date.now() - 1000) });

            // when
            await cleaner.$onReady();

            // then
            expect(storageService.deleteKeys).toHaveBeenCalledTimes(1);
            expect(storageService.deleteKeys).toHaveBeenCalledWith("s3", ["stale.png"], true);
        });

        it("keeps objects that have a matching DB row on the same backend", async () => {
            // given
            givenStorage({ local: ["known.png"] });
            givenEntries([makeEntry("t1", "known.png", "local")]);

            // when
            await cleaner.$onReady();

            // then
            expect(storageService.deleteKeys).not.toHaveBeenCalled();
            expect(fileService.processDelete).not.toHaveBeenCalled();
        });

        it("does not delete a candidate whose DB row appeared after the first snapshot", async () => {
            // given
            givenStorage({ s3: ["just-uploaded.png", "orphan.png"] });
            givenEntries([], [makeEntry("new", "just-uploaded.png", "s3")]);

            // when
            await cleaner.$onReady();

            // then
            expect(repo.getAllEntries).toHaveBeenCalledTimes(2);
            expect(storageService.deleteKeys).toHaveBeenCalledTimes(1);
            expect(storageService.deleteKeys).toHaveBeenCalledWith("s3", ["orphan.png"], true);
        });

        it("still deletes a candidate when a row with the same name appears on a different backend", async () => {
            // given
            givenStorage({ s3: ["shared.png"] });
            givenEntries([], [makeEntry("x", "shared.png", "local")]);

            // when
            await cleaner.$onReady();

            // then
            expect(storageService.deleteKeys).toHaveBeenCalledWith("s3", ["shared.png"], true);
        });

        it("deletes DB rows whose object is missing from their own backend and never touches other backends' rows", async () => {
            // given
            givenStorage({
                local: ["local-present.png", "s3-missing.png"],
                s3: ["s3-present.png", "local-missing.png"],
            });
            givenEntries([
                makeEntry("lp", "local-present.png", "local"),
                makeEntry("lm", "local-missing.png", "local"),
                makeEntry("sp", "s3-present.png", "s3"),
                makeEntry("sm", "s3-missing.png", "s3"),
            ]);

            // when
            await cleaner.$onReady();

            // then
            expect(fileService.processDelete).toHaveBeenCalledTimes(2);
            expect(fileService.processDelete).toHaveBeenCalledWith(["lm"]);
            expect(fileService.processDelete).toHaveBeenCalledWith(["sm"]);
        });

        it("skips a backend whose listing fails, still syncs the others and logs the failure", async () => {
            // given
            givenStorage({ s3: new Error("bucket unreachable"), local: ["local-orphan.png"] });
            givenEntries([makeEntry("s1", "s3-file.png", "s3"), makeEntry("l1", "local-missing.png", "local")]);

            // when
            await cleaner.$onReady();

            // then
            expect(fileService.processDelete).toHaveBeenCalledTimes(1);
            expect(fileService.processDelete).toHaveBeenCalledWith(["l1"]);
            expect(storageService.deleteKeys).toHaveBeenCalledTimes(1);
            expect(storageService.deleteKeys).toHaveBeenCalledWith("local", ["local-orphan.png"], true);
            expect(logger.error).toHaveBeenCalledTimes(1);
            expect(logger.error).toHaveBeenCalledWith(
                "Failed to sync files with the database: Failed to sync storage backend(s) s3: bucket unreachable",
            );
        });

        it("sweeps staged uploads with the staging grace period", async () => {
            // given
            givenStorage({ local: [] });

            // when
            await cleaner.$onReady();

            // then
            expect(storageService.sweepStaging).toHaveBeenCalledTimes(1);
            expect(storageService.sweepStaging).toHaveBeenCalledWith(stagingGraceMs);
            expect(repo.removeDuplicates).toHaveBeenCalledTimes(1);
        });

        it("continues with sync and the staging sweep when processing expired files fails", async () => {
            // given
            givenStorage({ local: ["orphan.png"] });
            repo.getExpiredFiles.mockRejectedValue(new Error("db down"));

            // when
            await cleaner.$onReady();

            // then
            expect(logger.error).toHaveBeenCalledWith("Failed to process expired files: db down");
            expect(storageService.deleteKeys).toHaveBeenCalledWith("local", ["orphan.png"], true);
            expect(storageService.sweepStaging).toHaveBeenCalledWith(stagingGraceMs);
        });
    });
});
