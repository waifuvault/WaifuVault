import { Inject, Injectable } from "@tsed/di";
import { ThumbnailCacheDao } from "../dao/ThumbnailCacheDao.js";
import { ThumbnailCacheModel } from "../../model/db/ThumbnailCache.model.js";

@Injectable()
export class ThumbnailCacheReo {
    public constructor(@Inject() private thumbnailCacheReo: ThumbnailCacheDao) {}

    public saveThumbnailCache(thumbnailCache: ThumbnailCacheModel): Promise<ThumbnailCacheModel> {
        return this.thumbnailCacheReo.saveThumbnailCache(thumbnailCache);
    }

    public saveThumbnailCaches(thumbnailCache: ThumbnailCacheModel[]): Promise<ThumbnailCacheModel[]> {
        return this.thumbnailCacheReo.saveThumbnailCaches(thumbnailCache);
    }

    public async deleteThumbnailCaches(fileIds: number[]): Promise<void> {
        await this.thumbnailCacheReo.deleteThumbnailCaches(fileIds);
    }

    public hasThumbnailCache(fileId: number): Promise<boolean> {
        return this.thumbnailCacheReo.hasThumbnailCache(fileId);
    }

    public hasThumbnails(fileIds: number[]): Promise<number[]> {
        return this.thumbnailCacheReo.hasThumbnails(fileIds);
    }
}
