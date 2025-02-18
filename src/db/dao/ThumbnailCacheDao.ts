import { Inject, Injectable } from "@tsed/di";
import { AbstractTypeOrmDao } from "./AbstractTypeOrmDao.js";
import { ThumbnailCacheModel } from "../../model/db/ThumbnailCache.model.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import { DataSource, EntityManager, In } from "typeorm";
import xxhash from "xxhash-wasm";
import { AfterInit } from "@tsed/common";

@Injectable()
export class ThumbnailCacheDao extends AbstractTypeOrmDao<ThumbnailCacheModel> implements AfterInit {
    private h64ToString: (input: string, seed?: bigint) => string;

    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, ThumbnailCacheModel);
    }

    private readonly cachedIds: Set<number> = new Set();

    public async $afterInit(): Promise<void> {
        const { h64ToString } = await xxhash();
        this.h64ToString = h64ToString;
    }

    public async saveThumbnailCache(
        thumbnailCache: ThumbnailCacheModel,
        transaction?: EntityManager,
    ): Promise<ThumbnailCacheModel> {
        const r = await this.getRepository(transaction).save(thumbnailCache);
        // await this.clearCache(null);
        return r;
    }

    public async deleteThumbnailCaches(fileIds: number[], transaction?: EntityManager): Promise<void> {
        await this.getRepository(transaction).delete({
            fileId: In(fileIds),
        });
        // await this.clearCache(fileIds);
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

    public async getThumbnailCache(fileId: number, transaction?: EntityManager): Promise<ThumbnailCacheModel | null> {
        const r = await this.getRepository(transaction).findOne({
            where: {
                fileId,
            },
            /* cache: {
                milliseconds: 600000, // 10 mins
                id: this.generateKey(fileId),
            },*/
        });
        // this.cachedIds.add(fileId);
        return r;
    }

    /*   private async clearCache(id: number | number[] | null): Promise<void> {
        if (id !== null) {
            await this.dataSource.queryResultCache?.remove([this.generateKey(id)]);
            if (Array.isArray(id)) {
                for (const id of this.cachedIds) {
                    this.cachedIds.delete(id);
                }
            } else {
                this.cachedIds.delete(id);
            }
        } else {
            const keys: string[] = [];
            for (const id of this.cachedIds) {
                keys.push(this.generateKey(id));
            }
            await this.dataSource.queryResultCache?.remove(keys);
            this.cachedIds.clear();
        }
    }

    private generateKey(fileId: number | number[]): string {
        return this.h64ToString(`thumbnailCache_${fileId}`);
    }*/
}
