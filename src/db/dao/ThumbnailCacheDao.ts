import { Inject, Injectable } from "@tsed/di";
import { AbstractTypeOrmDao } from "./AbstractTypeOrmDao.js";
import { ThumbnailCacheModel } from "../../model/db/ThumbnailCache.model.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import { DataSource, EntityManager, In } from "typeorm";

@Injectable()
export class ThumbnailCacheDao extends AbstractTypeOrmDao<ThumbnailCacheModel> {
    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, ThumbnailCacheModel);
    }

    public saveThumbnailCache(
        thumbnailCache: ThumbnailCacheModel,
        transaction?: EntityManager,
    ): Promise<ThumbnailCacheModel> {
        return this.getRepository(transaction).save(thumbnailCache);
    }

    public async deleteThumbnailCaches(fileIds: number[], transaction?: EntityManager): Promise<void> {
        await this.getRepository(transaction).delete({
            fileId: In(fileIds),
        });
    }

    public hasThumbnailCache(fileId: number, transaction?: EntityManager): Promise<boolean> {
        return this.getRepository(transaction).existsBy({
            fileId,
        });
    }

    public saveThumbnailCaches(
        thumbnailCache: ThumbnailCacheModel[],
        transaction?: EntityManager,
    ): Promise<ThumbnailCacheModel[]> {
        return this.getRepository(transaction).save(thumbnailCache);
    }
}
