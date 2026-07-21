import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataSource, Repository } from "typeorm";
import { createTestDataSource } from "../../__TEST__/testDataSource.js";
import { FileDao } from "../FileDao.js";
import { FileUploadModel } from "../../../model/db/FileUpload.model.js";

function fileFixture(overrides: Partial<FileUploadModel>): Partial<FileUploadModel> {
    return {
        fileName: "file",
        token: "token",
        checksum: "checksum",
        ip: null,
        originalFileName: "file.txt",
        fileExtension: "txt",
        fileSize: 1,
        expires: null,
        settings: null,
        mediaType: "text/plain",
        encrypted: false,
        bucketToken: null,
        albumToken: null,
        views: 0,
        addedToAlbumOrder: null,
        ...overrides,
    };
}

describe("FileDao", () => {
    let dataSource: DataSource;
    let dao: FileDao;
    let repo: Repository<FileUploadModel>;

    beforeEach(async () => {
        dataSource = await createTestDataSource();
        dao = new FileDao(dataSource);
        await dao.$afterInit();
        repo = dataSource.getRepository(FileUploadModel);
    });

    afterEach(async () => {
        await dataSource.destroy();
    });

    describe("removeDuplicates", () => {
        it("dedups anonymous files that share a checksum and a null ip (TypeORM v1 null-where regression)", async () => {
            await repo.save([
                repo.create(fileFixture({ token: "a1", checksum: "dup", ip: null })),
                repo.create(fileFixture({ token: "a2", checksum: "dup", ip: null })),
                repo.create(fileFixture({ token: "a3", checksum: "dup", ip: null })),
            ]);

            const deleted = await dao.removeDuplicates();

            expect(deleted).toHaveLength(2);
            const remaining = await repo.find({ where: { checksum: "dup" } });
            expect(remaining).toHaveLength(1);
        });

        it("dedups by (checksum, ip) and does not merge different ips", async () => {
            await repo.save([
                repo.create(fileFixture({ token: "b1", checksum: "x", ip: "1.1.1.1" })),
                repo.create(fileFixture({ token: "b2", checksum: "x", ip: "1.1.1.1" })),
                repo.create(fileFixture({ token: "b3", checksum: "x", ip: "2.2.2.2" })),
            ]);

            const deleted = await dao.removeDuplicates();

            expect(deleted).toHaveLength(1);
            expect(await repo.count()).toBe(2);
        });

        it("returns nothing when there are no duplicates", async () => {
            await repo.save([
                repo.create(fileFixture({ token: "c1", checksum: "one", ip: null })),
                repo.create(fileFixture({ token: "c2", checksum: "two", ip: "9.9.9.9" })),
            ]);

            const deleted = await dao.removeDuplicates();

            expect(deleted).toHaveLength(0);
            expect(await repo.count()).toBe(2);
        });
    });

    describe("getEntriesFromChecksum", () => {
        it("matches null-bucket rows when no bucket is given (IsNull path)", async () => {
            await repo.save([
                repo.create(fileFixture({ token: "d1", checksum: "z", bucketToken: null })),
                repo.create(fileFixture({ token: "d2", checksum: "other", bucketToken: null })),
            ]);

            const found = await dao.getEntriesFromChecksum("z");

            expect(found).toHaveLength(1);
            expect(found[0].token).toBe("d1");
        });
    });

    describe("deleteEntries", () => {
        it("deletes exactly the given tokens and reports success", async () => {
            await repo.save([
                repo.create(fileFixture({ token: "e1", checksum: "k1" })),
                repo.create(fileFixture({ token: "e2", checksum: "k2" })),
            ]);

            const ok = await dao.deleteEntries(["e1"]);

            expect(ok).toBe(true);
            expect(await repo.count()).toBe(1);
            expect(await repo.findOneBy({ token: "e2" })).not.toBeNull();
        });
    });

    describe("getAllEntries", () => {
        it("returns all with no ids, filters by id when given, and returns none for an explicit empty list", async () => {
            const saved = await repo.save([
                repo.create(fileFixture({ token: "f1", checksum: "k1" })),
                repo.create(fileFixture({ token: "f2", checksum: "k2" })),
            ]);

            expect(await dao.getAllEntries()).toHaveLength(2);

            const byId = await dao.getAllEntries([saved[0].id]);
            expect(byId).toHaveLength(1);
            expect(byId[0].token).toBe("f1");

            expect(await dao.getAllEntries([])).toHaveLength(0);
        });
    });

    describe("clearCache", () => {
        it("saveEntry never calls queryResultCache.remove with an empty key list (TypeORM v1 redis DEL guard)", async () => {
            const cache = dataSource.queryResultCache;
            if (!cache) {
                throw new Error("query result cache not configured");
            }
            const removeSpy = vi.spyOn(cache, "remove");

            await dao.saveEntry(repo.create(fileFixture({ token: "s1", checksum: "s1" })));

            for (const call of removeSpy.mock.calls) {
                expect(call[0].length).toBeGreaterThan(0);
            }
        });

        it("clearCache with a token array removes each token's key, not one joined key", async () => {
            const cache = dataSource.queryResultCache;
            if (!cache) {
                throw new Error("query result cache not configured");
            }
            const removeSpy = vi.spyOn(cache, "remove");

            await dao.clearCache(["t1", "t2", "t3"]);

            expect(removeSpy).toHaveBeenCalledTimes(1);
            expect(removeSpy.mock.calls[0][0]).toHaveLength(3);
        });
    });
});
