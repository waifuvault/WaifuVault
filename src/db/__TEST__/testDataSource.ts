import { DataSource } from "typeorm";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { BucketModel } from "../../model/db/Bucket.model.js";
import { AlbumModel } from "../../model/db/Album.model.js";
import { ThumbnailCacheModel } from "../../model/db/ThumbnailCache.model.js";

export async function createTestDataSource(): Promise<DataSource> {
    const dataSource = new DataSource({
        type: "better-sqlite3",
        database: ":memory:",
        synchronize: true,
        dropSchema: true,
        entities: [FileUploadModel, BucketModel, AlbumModel, ThumbnailCacheModel],
        cache: true,
    });

    await dataSource.initialize();

    return dataSource;
}
