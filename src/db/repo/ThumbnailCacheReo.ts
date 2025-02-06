import { Inject, Injectable } from "@tsed/di";
import { ThumbnailCacheDao } from "../dao/ThumbnailCacheDao.js";
import { ThumbnailCacheModel } from "../../model/db/ThumbnailCache.model.js";

@Injectable()
export class ThumbnailCacheReo {
    public constructor(@Inject() private thumbnailCacheDao: ThumbnailCacheDao) {}

    public saveThumbnailCache(thumbnailCache: ThumbnailCacheModel): Promise<ThumbnailCacheModel> {
        return this.thumbnailCacheDao.saveThumbnailCache(thumbnailCache);
    }

    public saveThumbnailCaches(thumbnailCache: ThumbnailCacheModel[]): Promise<ThumbnailCacheModel[]> {
        return this.thumbnailCacheDao.saveThumbnailCaches(thumbnailCache);
    }

    public async deleteThumbnailCaches(fileIds: number[]): Promise<void> {
        await this.thumbnailCacheDao.deleteThumbnailCaches(fileIds);
    }

    public hasThumbnailCache(fileId: number): Promise<boolean> {
        return this.thumbnailCacheDao.hasThumbnailCache(fileId);
    }

    public hasThumbnails(fileIds: number[]): Promise<number[]> {
        return this.thumbnailCacheDao.hasThumbnails(fileIds);
    }
}
