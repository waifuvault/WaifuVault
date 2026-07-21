import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DataSource, Repository } from "typeorm";
import { createTestDataSource } from "../../__TEST__/testDataSource.js";
import { BucketDao } from "../BucketDao.js";
import { BucketModel } from "../../../model/db/Bucket.model.js";
import { AlbumModel } from "../../../model/db/Album.model.js";
import { FileUploadModel } from "../../../model/db/FileUpload.model.js";
import BucketType from "../../../model/constants/BucketType.js";

describe("BucketDao", () => {
    let dataSource: DataSource;
    let dao: BucketDao;
    let bucketRepo: Repository<BucketModel>;
    let albumRepo: Repository<AlbumModel>;
    let fileRepo: Repository<FileUploadModel>;

    beforeEach(async () => {
        dataSource = await createTestDataSource();
        dao = new BucketDao(dataSource);
        bucketRepo = dataSource.getRepository(BucketModel);
        albumRepo = dataSource.getRepository(AlbumModel);
        fileRepo = dataSource.getRepository(FileUploadModel);
    });

    afterEach(async () => {
        await dataSource.destroy();
    });

    function makeFile(token: string, albumToken: string | null): Partial<FileUploadModel> {
        return {
            fileName: token,
            token,
            checksum: token,
            ip: null,
            originalFileName: `${token}.txt`,
            fileExtension: "txt",
            fileSize: 1,
            expires: null,
            settings: null,
            mediaType: "text/plain",
            encrypted: false,
            bucketToken: "b1",
            albumToken,
            views: 0,
            addedToAlbumOrder: null,
        };
    }

    async function seed(): Promise<{ bucketId: number }> {
        const bucket = await bucketRepo.save(
            bucketRepo.create({ bucketToken: "b1", ip: "1.2.3.4", type: BucketType.NORMAL }),
        );
        await albumRepo.save(
            albumRepo.create({ name: "a1", bucketToken: "b1", albumToken: "alb1", publicToken: null, views: 0 }),
        );
        await fileRepo.save([fileRepo.create(makeFile("bf1", "alb1")), fileRepo.create(makeFile("bf2", null))]);
        return { bucketId: bucket.id };
    }

    it("getBucket by token loads both files and albums (buildRelations)", async () => {
        await seed();

        const bucket = await dao.getBucket("b1");

        expect(bucket?.files).toHaveLength(2);
        expect(bucket?.albums).toHaveLength(1);
    });

    it("getBucket loads only files when includeAlbums is false", async () => {
        await seed();

        const bucket = await dao.getBucket("b1", true, false);

        expect(bucket?.files).toHaveLength(2);
        expect(bucket?.albums).toBeUndefined();
    });

    it("getBucket loads no relations when both flags are false", async () => {
        await seed();

        const bucket = await dao.getBucket("b1", false, false);

        expect(bucket?.bucketToken).toBe("b1");
        expect(bucket?.files).toBeUndefined();
        expect(bucket?.albums).toBeUndefined();
    });

    it("getBucket by numeric id loads the nested files.album relation", async () => {
        const { bucketId } = await seed();

        const bucket = await dao.getBucket(bucketId);

        expect(bucket?.bucketToken).toBe("b1");
        expect(bucket?.albums).toHaveLength(1);

        const fileWithAlbum = bucket?.files?.find(f => f.albumToken === "alb1");
        const album = await fileWithAlbum?.album;
        expect(album?.albumToken).toBe("alb1");
    });

    it("getBucketByIp finds the bucket by ip and loads relations", async () => {
        await seed();

        const bucket = await dao.getBucketByIp("1.2.3.4");

        expect(bucket?.bucketToken).toBe("b1");
        expect(bucket?.files).toHaveLength(2);
    });
});
