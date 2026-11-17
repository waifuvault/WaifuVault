import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataSource, Repository } from "typeorm";
import { createTestDataSource } from "../../__TEST__/testDataSource.js";
import { FileDao } from "../FileDao.js";
import { FileUploadModel } from "../../../model/db/FileUpload.model.js";
import { BucketModel } from "../../../model/db/Bucket.model.js";
import type { FileSearchTerm } from "../../../utils/typeings.js";

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

    describe("getEntriesMatching", () => {
        const nameAndIp: FileSearchTerm["columns"] = ["fileName", "fileExtension", "ip", "originalFileName"];

        beforeEach(async () => {
            await repo.save([
                repo.create(
                    fileFixture({ token: "m1", checksum: "m1", ip: "aaa111", originalFileName: "football.png" }),
                ),
                repo.create(
                    fileFixture({ token: "m2", checksum: "m2", ip: "bbb222", originalFileName: "bug_footage.mp4" }),
                ),
                repo.create(fileFixture({ token: "m3", checksum: "m3", ip: null, originalFileName: "cat.jpg" })),
                repo.create(
                    fileFixture({
                        token: "m4",
                        checksum: "m4",
                        ip: "aaa111",
                        originalFileName: "food.png",
                        expires: 1,
                    }),
                ),
            ]);
        });

        it("matches a term case-insensitively across name and ip and skips expired files", async () => {
            const terms: FileSearchTerm[] = [{ columns: nameAndIp, value: "FOO", exclude: false, exact: false }];

            const found = await dao.getEntriesMatching(terms, 0, 10, "id", "ASC");

            expect(found.map(file => file.token)).toEqual(["m1", "m2"]);
        });

        it("excludes an ip while keeping files with no ip", async () => {
            const terms: FileSearchTerm[] = [{ columns: ["ip"], value: "aaa111", exclude: true, exact: true }];

            const found = await dao.getEntriesMatching(terms, 0, 10, "id", "ASC");

            expect(found.map(file => file.token)).toEqual(["m2", "m3"]);
            expect(await dao.getMatchingRecordCount(terms)).toBe(2);
        });

        it("matches an exact ip only, never a part of one", async () => {
            const partial: FileSearchTerm[] = [{ columns: ["ip"], value: "aaa", exclude: true, exact: true }];
            const whole: FileSearchTerm[] = [{ columns: ["ip"], value: "AAA111", exclude: false, exact: true }];

            expect(await dao.getMatchingRecordCount(partial)).toBe(3);
            expect((await dao.getEntriesMatching(whole, 0, 10, "id", "ASC")).map(file => file.token)).toEqual(["m1"]);
        });

        it("treats underscore and percent as literal characters", async () => {
            const found = await dao.getEntriesMatching(
                [{ columns: ["originalFileName"], value: "g_f", exclude: false, exact: false }],
                0,
                10,
                "id",
                "ASC",
            );

            expect(found.map(file => file.token)).toEqual(["m2"]);
            expect(
                await dao.getMatchingRecordCount([
                    { columns: ["originalFileName"], value: "l_p", exclude: false, exact: false },
                ]),
            ).toBe(0);
            expect(
                await dao.getMatchingRecordCount([
                    { columns: ["originalFileName"], value: "%", exclude: false, exact: false },
                ]),
            ).toBe(0);
        });

        it("pages and sorts in the query", async () => {
            const found = await dao.getEntriesMatching([], 1, 1, "originalFileName", "DESC");

            expect(found.map(file => file.token)).toEqual(["m3"]);
            expect(await dao.getMatchingRecordCount([])).toBe(3);
        });
    });

    describe("getBucketFileCounts", () => {
        it("counts unexpired files per bucket and ignores files with no bucket", async () => {
            await dataSource.getRepository(BucketModel).save([{ bucketToken: "b1" }, { bucketToken: "b2" }]);
            await repo.save([
                repo.create(fileFixture({ token: "n1", checksum: "n1", bucketToken: "b1" })),
                repo.create(fileFixture({ token: "n2", checksum: "n2", bucketToken: "b1" })),
                repo.create(fileFixture({ token: "n3", checksum: "n3", bucketToken: "b2", expires: 1 })),
                repo.create(fileFixture({ token: "n4", checksum: "n4", bucketToken: null })),
            ]);

            expect(await dao.getBucketFileCounts()).toEqual([{ token: "b1", fileCount: 2 }]);
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
