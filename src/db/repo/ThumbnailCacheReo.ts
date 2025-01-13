import { Inject, Injectable } from "@tsed/di";
import { ThumbnailCacheDao } from "../dao/ThumbnailCacheDao.js";
import { ThumbnailCacheModel } from "../../model/db/ThumbnailCache.model.js";

@Injectable()
export class ThumbnailCacheReo {
    public constructor(@Inject() private thumbnailCacheReo: ThumbnailCacheDao) {}

    public saveThumbnailCache(thumbnailCache: ThumbnailCacheModel): Promise<ThumbnailCacheModel> {
        return this.thumbnailCacheReo.saveThumbnailCache(thumbnailCache);
    }
}
