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

    public async hasThumbnails(fileIds: number[], transaction?: EntityManager): Promise<number[]> {
        const res = await this.getRepository(transaction).find({
            select: ["fileId"],
            where: {
                fileId: In(fileIds),
            },
        });
        return res.map(r => r.fileId);
    }

    public saveThumbnailCaches(
        thumbnailCache: ThumbnailCacheModel[],
        transaction?: EntityManager,
    ): Promise<ThumbnailCacheModel[]> {
        return this.getRepository(transaction).save(thumbnailCache);
    }

    public getThumbnailCache(fileId: number, transaction?: EntityManager): Promise<ThumbnailCacheModel | null> {
        return this.getRepository(transaction).findOne({
            where: {
                fileId,
            },
        });
    }
}
