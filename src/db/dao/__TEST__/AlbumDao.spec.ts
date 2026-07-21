import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DataSource, Repository } from "typeorm";
import { createTestDataSource } from "../../__TEST__/testDataSource.js";
import { AlbumDao } from "../AlbumDao.js";
import { AlbumModel } from "../../../model/db/Album.model.js";
import { BucketModel } from "../../../model/db/Bucket.model.js";
import { FileUploadModel } from "../../../model/db/FileUpload.model.js";
import BucketType from "../../../model/constants/BucketType.js";

describe("AlbumDao", () => {
    let dataSource: DataSource;
    let dao: AlbumDao;
    let bucketRepo: Repository<BucketModel>;
    let albumRepo: Repository<AlbumModel>;
    let fileRepo: Repository<FileUploadModel>;

    beforeEach(async () => {
        dataSource = await createTestDataSource();
        dao = new AlbumDao(dataSource);
        bucketRepo = dataSource.getRepository(BucketModel);
        albumRepo = dataSource.getRepository(AlbumModel);
        fileRepo = dataSource.getRepository(FileUploadModel);
    });

    afterEach(async () => {
        await dataSource.destroy();
    });

    function fileInAlbum(token: string, order: number): Partial<FileUploadModel> {
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
            albumToken: "alb1",
            views: 0,
            addedToAlbumOrder: order,
        };
    }

    async function seedAlbumWithFiles(): Promise<void> {
        await bucketRepo.save(bucketRepo.create({ bucketToken: "b1", ip: "ip-b1", type: BucketType.NORMAL }));
        await albumRepo.save(
            albumRepo.create({ name: "holiday", bucketToken: "b1", albumToken: "alb1", publicToken: "pub1", views: 0 }),
        );
        await fileRepo.save([
            fileRepo.create(fileInAlbum("f-second", 2)),
            fileRepo.create(fileInAlbum("f-first", 1)),
            fileRepo.create(fileInAlbum("f-third", 3)),
        ]);
    }

    it("loads files ordered by addedToAlbumOrder ascending", async () => {
        await seedAlbumWithFiles();

        const album = await dao.getAlbum("alb1");

        expect(album?.files?.map(f => f.token)).toEqual(["f-first", "f-second", "f-third"]);
    });

    it("does not load files when includeFiles is false", async () => {
        await seedAlbumWithFiles();

        const album = await dao.getAlbum("alb1", false);

        expect(album?.albumToken).toBe("alb1");
        expect(album?.files).toBeUndefined();
    });

    it("resolves an album by its publicToken as well as its albumToken", async () => {
        await seedAlbumWithFiles();

        const album = await dao.getAlbum("pub1");

        expect(album?.albumToken).toBe("alb1");
    });

    it("getAllAlbums returns all albums, or filters by bucketToken", async () => {
        await bucketRepo.save(bucketRepo.create({ bucketToken: "b1", ip: "ip-b1", type: BucketType.NORMAL }));
        await bucketRepo.save(bucketRepo.create({ bucketToken: "b2", ip: "ip-b2", type: BucketType.NORMAL }));
        await albumRepo.save([
            albumRepo.create({ name: "a1", bucketToken: "b1", albumToken: "alb1", publicToken: null, views: 0 }),
            albumRepo.create({ name: "a2", bucketToken: "b2", albumToken: "alb2", publicToken: null, views: 0 }),
        ]);

        expect(await dao.getAllAlbums(false)).toHaveLength(2);

        const forB1 = await dao.getAllAlbums(false, "b1");
        expect(forB1).toHaveLength(1);
        expect(forB1[0].albumToken).toBe("alb1");
    });

    it("getAlbumByName returns the album matching name and bucket", async () => {
        await bucketRepo.save(bucketRepo.create({ bucketToken: "b1", ip: "ip-b1", type: BucketType.NORMAL }));
        await albumRepo.save(
            albumRepo.create({ name: "holiday", bucketToken: "b1", albumToken: "alb1", publicToken: null, views: 0 }),
        );

        const album = await dao.getAlbumByName("holiday", "b1");

        expect(album?.albumToken).toBe("alb1");
        expect(await dao.getAlbumByName("missing", "b1")).toBeNull();
    });
});
