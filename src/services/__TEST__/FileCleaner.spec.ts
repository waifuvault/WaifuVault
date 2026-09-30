import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Logger } from "@tsed/logger";
import type { FileRepo } from "../../db/repo/FileRepo.js";
import type { FileService } from "../FileService.js";
import type { StorageService } from "../StorageService.js";
import type { FileUploadModel } from "../../model/db/FileUpload.model.js";
import type { StorageBackend, StoredObjectInfo } from "../../utils/typeings.js";
import { isSchedulerLeader } from "../../utils/clusterUtils.js";
import { FileCleaner } from "../FileCleaner.js";

vi.mock("../../model/di/decorators/RunEvery.js", () => ({
    RunEvery: vi.fn(() => vi.fn()),
}));

vi.mock("../../utils/clusterUtils.js", () => ({
    isSchedulerLeader: vi.fn(),
}));

const syncGraceMs = 5 * 60 * 1000;
const stagingGraceMs = 60 * 60 * 1000;
const oldDate = new Date(Date.now() - syncGraceMs * 2);

type Listing = Partial<Record<StorageBackend, string[] | Error>>;

function entry(token: string, fullFileNameOnSystem: string, storageBackend: StorageBackend): FileUploadModel {
    return { token, fullFileNameOnSystem, storageBackend } as FileUploadModel;
}

function createFixture(
    listing: Listing,
    firstSnapshot: FileUploadModel[] = [],
    secondSnapshot: FileUploadModel[] = firstSnapshot,
    modified: Record<string, Date> = {},
): {
    cleaner: FileCleaner;
    repo: {
        getExpiredFiles: ReturnType<typeof vi.fn>;
        getAllEntries: ReturnType<typeof vi.fn>;
        removeDuplicates: ReturnType<typeof vi.fn>;
    };
    fileService: { processDelete: ReturnType<typeof vi.fn> };
    logger: { error: ReturnType<typeof vi.fn> };
    storage: {
        backends: StorageBackend[];
        listKeys: ReturnType<typeof vi.fn>;
        headKey: ReturnType<typeof vi.fn>;
        deleteKeys: ReturnType<typeof vi.fn>;
        sweepStaging: ReturnType<typeof vi.fn>;
    };
} {
    const repo = {
        getExpiredFiles: vi.fn().mockResolvedValue([]),
        getAllEntries: vi.fn().mockResolvedValueOnce(firstSnapshot).mockResolvedValue(secondSnapshot),
        removeDuplicates: vi.fn().mockResolvedValue([]),
    };
    const fileService = { processDelete: vi.fn().mockResolvedValue(true) };
    const logger = { error: vi.fn() };
    const storage = {
        backends: Object.keys(listing) as StorageBackend[],
        listKeys: vi.fn(async function* (backend: StorageBackend): AsyncGenerator<string> {
            const keys = listing[backend];
            if (keys instanceof Error) {
                throw keys;
            }
            for (const key of keys ?? []) {
                yield key;
            }
        }),
        headKey: vi.fn((_backend: StorageBackend, key: string): Promise<StoredObjectInfo | null> =>
            Promise.resolve({ lastModified: modified[key] ?? oldDate } as StoredObjectInfo),
        ),
        deleteKeys: vi.fn().mockResolvedValue(undefined),
        sweepStaging: vi.fn().mockResolvedValue(undefined),
    };
    const cleaner = new FileCleaner(
        repo as unknown as FileRepo,
        fileService as unknown as FileService,
        logger as unknown as Logger,
        storage as unknown as StorageService,
    );
    return { cleaner, repo, fileService, logger, storage };
}

describe("FileCleaner", () => {
    beforeEach(() => {
        vi.mocked(isSchedulerLeader).mockReset();
        vi.mocked(isSchedulerLeader).mockReturnValue(true);
    });

    describe("processFiles", () => {
        it("deletes the tokens of expired entries", async () => {
            // given
            const { cleaner, repo, fileService } = createFixture({});
            repo.getExpiredFiles.mockResolvedValue([entry("a", "a.png", "local"), entry("b", "b.png", "s3")]);

            // when
            await cleaner.processFiles();

            // then
            expect(fileService.processDelete).toHaveBeenCalledTimes(1);
            expect(fileService.processDelete).toHaveBeenCalledWith(["a", "b"]);
        });

        it("does nothing when no entries have expired", async () => {
            // given
            const { cleaner, fileService } = createFixture({});

            // when
            await cleaner.processFiles();

            // then
            expect(fileService.processDelete).not.toHaveBeenCalled();
        });
    });

    describe("$onReady", () => {
        it("does nothing when this instance is not the scheduler leader", async () => {
            // given
            vi.mocked(isSchedulerLeader).mockReturnValue(false);
            const { cleaner, repo, storage, fileService } = createFixture({ local: ["orphan.png"] });

            // when
            await cleaner.$onReady();

            // then
            expect(repo.getExpiredFiles).not.toHaveBeenCalled();
            expect(repo.getAllEntries).not.toHaveBeenCalled();
            expect(repo.removeDuplicates).not.toHaveBeenCalled();
            expect(storage.listKeys).not.toHaveBeenCalled();
            expect(storage.sweepStaging).not.toHaveBeenCalled();
            expect(fileService.processDelete).not.toHaveBeenCalled();
        });

        it("soft-deletes old orphaned objects on their own backend only", async () => {
            // given
            const { cleaner, storage, logger } = createFixture({
                local: ["local-orphan.png"],
                s3: ["s3-orphan.png"],
            });

            // when
            await cleaner.$onReady();

            // then
            expect(storage.deleteKeys).toHaveBeenCalledTimes(2);
            expect(storage.deleteKeys).toHaveBeenCalledWith("local", ["local-orphan.png"], true);
            expect(storage.deleteKeys).toHaveBeenCalledWith("s3", ["s3-orphan.png"], true);
            expect(storage.headKey).toHaveBeenCalledWith("local", "local-orphan.png");
            expect(storage.headKey).toHaveBeenCalledWith("s3", "s3-orphan.png");
            expect(logger.error).not.toHaveBeenCalled();
        });

        it("keeps orphaned objects modified within the grace period", async () => {
            // given
            const { cleaner, storage } = createFixture({ s3: ["fresh.png", "stale.png"] }, [], [], {
                "fresh.png": new Date(Date.now() - 1000),
            });

            // when
            await cleaner.$onReady();

            // then
            expect(storage.deleteKeys).toHaveBeenCalledTimes(1);
            expect(storage.deleteKeys).toHaveBeenCalledWith("s3", ["stale.png"], true);
        });

        it("keeps objects that have a matching DB row on the same backend", async () => {
            // given
            const { cleaner, storage, fileService } = createFixture({ local: ["known.png"] }, [
                entry("t1", "known.png", "local"),
            ]);

            // when
            await cleaner.$onReady();

            // then
            expect(storage.deleteKeys).not.toHaveBeenCalled();
            expect(fileService.processDelete).not.toHaveBeenCalled();
        });

        it("does not delete a candidate whose DB row appeared after the first snapshot", async () => {
            // given
            const { cleaner, storage, repo } = createFixture(
                { s3: ["just-uploaded.png", "orphan.png"] },
                [],
                [entry("new", "just-uploaded.png", "s3")],
            );

            // when
            await cleaner.$onReady();

            // then
            expect(repo.getAllEntries).toHaveBeenCalledTimes(2);
            expect(storage.deleteKeys).toHaveBeenCalledTimes(1);
            expect(storage.deleteKeys).toHaveBeenCalledWith("s3", ["orphan.png"], true);
        });

        it("still deletes a candidate when a row with the same name appears on a different backend", async () => {
            // given
            const { cleaner, storage } = createFixture({ s3: ["shared.png"] }, [], [entry("x", "shared.png", "local")]);

            // when
            await cleaner.$onReady();

            // then
            expect(storage.deleteKeys).toHaveBeenCalledWith("s3", ["shared.png"], true);
        });

        it("deletes DB rows whose object is missing from their own backend and never touches other backends' rows", async () => {
            // given
            const { cleaner, fileService } = createFixture(
                {
                    local: ["local-present.png", "s3-missing.png"],
                    s3: ["s3-present.png", "local-missing.png"],
                },
                [
                    entry("lp", "local-present.png", "local"),
                    entry("lm", "local-missing.png", "local"),
                    entry("sp", "s3-present.png", "s3"),
                    entry("sm", "s3-missing.png", "s3"),
                ],
            );

            // when
            await cleaner.$onReady();

            // then
            expect(fileService.processDelete).toHaveBeenCalledTimes(2);
            expect(fileService.processDelete).toHaveBeenCalledWith(["lm"]);
            expect(fileService.processDelete).toHaveBeenCalledWith(["sm"]);
        });

        it("skips a backend whose listing fails, still syncs the others and logs the failure", async () => {
            // given
            const { cleaner, fileService, storage, logger } = createFixture(
                {
                    s3: new Error("bucket unreachable"),
                    local: ["local-orphan.png"],
                },
                [entry("s1", "s3-file.png", "s3"), entry("l1", "local-missing.png", "local")],
            );

            // when
            await cleaner.$onReady();

            // then
            expect(fileService.processDelete).toHaveBeenCalledTimes(1);
            expect(fileService.processDelete).toHaveBeenCalledWith(["l1"]);
            expect(storage.deleteKeys).toHaveBeenCalledTimes(1);
            expect(storage.deleteKeys).toHaveBeenCalledWith("local", ["local-orphan.png"], true);
            expect(logger.error).toHaveBeenCalledTimes(1);
            expect(logger.error).toHaveBeenCalledWith(
                "Failed to sync files with the database: Failed to sync storage backend(s) s3: bucket unreachable",
            );
        });

        it("sweeps staged uploads with the staging grace period", async () => {
            // given
            const { cleaner, storage, repo } = createFixture({ local: [] });

            // when
            await cleaner.$onReady();

            // then
            expect(storage.sweepStaging).toHaveBeenCalledTimes(1);
            expect(storage.sweepStaging).toHaveBeenCalledWith(stagingGraceMs);
            expect(repo.removeDuplicates).toHaveBeenCalledTimes(1);
        });

        it("continues with sync and the staging sweep when processing expired files fails", async () => {
            // given
            const { cleaner, repo, storage, logger } = createFixture({ local: ["orphan.png"] });
            repo.getExpiredFiles.mockRejectedValue(new Error("db down"));

            // when
            await cleaner.$onReady();

            // then
            expect(logger.error).toHaveBeenCalledWith("Failed to process expired files: db down");
            expect(storage.deleteKeys).toHaveBeenCalledWith("local", ["orphan.png"], true);
            expect(storage.sweepStaging).toHaveBeenCalledWith(stagingGraceMs);
        });
    });
});
