import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { DataSource } from "typeorm";
import { createTestDataSource } from "../../__TEST__/testDataSource.js";
import { ThumbnailCacheRepo } from "../ThumbnailCacheRepo.js";
import { ThumbnailCacheDao } from "../../dao/ThumbnailCacheDao.js";
import type { RedisConnection } from "../../../redis/Connection.js";
import { FileUploadModel } from "../../../model/db/FileUpload.model.js";
import { ThumbnailCacheModel } from "../../../model/db/ThumbnailCache.model.js";

describe("ThumbnailCacheRepo", () => {
    let dataSource: DataSource;
    let redis: { del: Mock; mset: Mock; setex: Mock; getBuffer: Mock };
    let repo: ThumbnailCacheRepo;

    beforeEach(async () => {
        dataSource = await createTestDataSource();
        redis = {
            del: vi.fn().mockResolvedValue(1),
            mset: vi.fn().mockResolvedValue("OK"),
            setex: vi.fn().mockResolvedValue("OK"),
            getBuffer: vi.fn().mockResolvedValue(null),
        };
        repo = new ThumbnailCacheRepo(new ThumbnailCacheDao(dataSource), redis as unknown as RedisConnection);
    });

    afterEach(async () => {
        await dataSource.destroy();
    });

    it("deleteThumbnailCaches never calls redis.del for an empty id list (redis DEL guard)", async () => {
        await repo.deleteThumbnailCaches([]);

        expect(redis.del).not.toHaveBeenCalled();
    });

    it("saveThumbnailCaches never calls redis.mset for an empty list (redis MSET guard)", async () => {
        await repo.saveThumbnailCaches([]);

        expect(redis.mset).not.toHaveBeenCalled();
    });

    it("deleteThumbnailCaches evicts each fileId key when ids are present", async () => {
        const fileRepo = dataSource.getRepository(FileUploadModel);
        const cacheRepo = dataSource.getRepository(ThumbnailCacheModel);

        const file = await fileRepo.save(
            fileRepo.create({
                fileName: "f",
                token: "t",
                checksum: "c",
                ip: null,
                originalFileName: "f.txt",
                fileExtension: "txt",
                fileSize: 1,
                expires: null,
                settings: null,
                mediaType: "image/png",
                encrypted: false,
                bucketToken: null,
                albumToken: null,
                views: 0,
                addedToAlbumOrder: null,
            }),
        );
        await cacheRepo.save(cacheRepo.create({ data: "abc", fileId: file.id }));

        await repo.deleteThumbnailCaches([file.id]);

        expect(redis.del).toHaveBeenCalledWith(`thumbnail:${file.id}`);
        expect(await cacheRepo.count()).toBe(0);
    });
});
