import { Inject, Injectable } from "@tsed/di";
import { AbstractTypeOrmDao } from "./AbstractTypeOrmDao.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import {
    DataSource,
    EntityManager,
    Equal,
    FindOptionsRelations,
    In,
    IsNull,
    LessThan,
    Like,
    MoreThan,
    Or,
} from "typeorm";
import { FindOperator } from "typeorm/find-options/FindOperator.js";
import { AfterInit } from "@tsed/common";
import xxhash from "xxhash-wasm";
import { TimedSet } from "../../utils/timedSet/TimedSet.js";

@Injectable()
export class FileDao extends AbstractTypeOrmDao<FileUploadModel> implements AfterInit {
    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, FileUploadModel);
    }

    private readonly cacheTime = 60000;

    private h64ToString: (input: string, seed?: bigint) => string;
    private readonly cachedToken: TimedSet<string | number> = new TimedSet(this.cacheTime);

    private readonly relation: { relations: FindOptionsRelations<FileUploadModel> } = {
        relations: {
            bucket: true,
            album: true,
        },
    };

    public async $afterInit(): Promise<void> {
        const { h64ToString } = await xxhash();
        this.h64ToString = h64ToString;
    }

    private get expiresCondition(): FindOperator<number> {
        return Or(MoreThan(Date.now()), IsNull());
    }

    public async saveEntry(entry: FileUploadModel, transaction?: EntityManager): Promise<FileUploadModel> {
        const r = await this.getRepository(transaction).save(entry);
        await this.clearCache(null);
        return r;
    }

    public async saveEntries(entries: FileUploadModel[], transaction?: EntityManager): Promise<FileUploadModel[]> {
        const r = await this.getRepository(transaction).save(entries);
        await this.clearCache(null);
        return r;
    }

    public async getEntries(
        tokens: string[],
        loadRelations = true,
        transaction?: EntityManager,
    ): Promise<FileUploadModel[]> {
        let r: FileUploadModel[] = [];
        if (loadRelations) {
            r = await this.getRepository(transaction).find({
                where: {
                    token: In(tokens),
                },
                cache: {
                    milliseconds: this.cacheTime,
                    id: this.generateKey(tokens),
                },
                ...this.relation,
            });
        } else {
            r = await this.getRepository(transaction).find({
                where: {
                    token: In(tokens),
                },
                cache: {
                    milliseconds: this.cacheTime,
                    id: this.generateKey(tokens),
                },
            });
        }

        for (const token of tokens) {
            this.cachedToken.add(token);
        }
        return r;
    }

    public async getEntriesFromChecksum(checksum: string, transaction?: EntityManager): Promise<FileUploadModel[]> {
        const r = await this.getRepository(transaction).find({
            where: {
                checksum,
            },
            cache: {
                milliseconds: this.cacheTime,
                id: this.generateKey(checksum),
            },
        });
        this.cachedToken.add(checksum);
        return r;
    }

    public async deleteEntries(tokens: string[], transaction?: EntityManager): Promise<boolean> {
        const deleteResult = await this.getRepository(transaction).delete({
            token: In(tokens),
        });
        await this.clearCache(tokens);
        for (const token of tokens) {
            this.cachedToken.delete(token);
        }
        return deleteResult.affected === tokens.length;
    }

    public getAllEntries(ids: number[] = [], transaction?: EntityManager): Promise<FileUploadModel[]> {
        if (ids.length > 0) {
            return this.getRepository(transaction).find({
                where: {
                    id: In(ids),
                },
                ...this.relation,
            });
        }
        return this.getRepository(transaction).find();
    }

    public getTotalFileSize(transaction?: EntityManager): Promise<number | null> {
        return this.getRepository(transaction).sum("fileSize", {
            expires: this.expiresCondition,
        });
    }

    public getAllEntriesOrdered(
        start: number,
        records: number,
        sortColumn?: string,
        sortOrder?: string,
        search?: string,
        bucket?: string,
        transaction?: EntityManager,
    ): Promise<FileUploadModel[]> {
        const orderOptions = sortColumn ? { [sortColumn]: sortOrder } : {};
        if (search && bucket) {
            search = `%${search}%`;
            return this.getRepository(transaction).find({
                where: [
                    { album: { name: Like(search) }, bucketToken: Equal(bucket), expires: this.expiresCondition },
                    { fileName: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                    { fileExtension: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                    { ip: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                    { originalFileName: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                ],
                order: orderOptions,
                skip: start,
                take: records,
                relations: ["album"],
            });
        }

        if (search) {
            return this.getRepository(transaction).find({
                where: this.getSearchQuery(search, bucket),
                order: orderOptions,
                skip: start,
                take: records,
            });
        }
        if (bucket) {
            return this.getRepository(transaction).find({
                where: {
                    bucketToken: Equal(bucket),
                    expires: this.expiresCondition,
                },
                order: orderOptions,
                skip: start,
                take: records,
            });
        }
        return this.getRepository(transaction).find({
            where: {
                expires: this.expiresCondition,
            },
            order: orderOptions,
            skip: start,
            take: records,
            ...this.relation,
        });
    }

    public getEntryFileName(fileName: string, transaction?: EntityManager): Promise<FileUploadModel | null> {
        return this.getRepository(transaction).findOne({
            where: {
                fileName,
            },
        });
    }

    public getRecordCount(bucket?: string, transaction?: EntityManager): Promise<number> {
        if (bucket) {
            return this.getRepository(transaction).count({
                where: {
                    expires: this.expiresCondition,
                    bucketToken: Equal(bucket),
                },
            });
        }
        return this.getRepository(transaction).count({
            where: { expires: this.expiresCondition },
        });
    }

    public getSearchRecordCount(search: string, bucket?: string, transaction?: EntityManager): Promise<number> {
        if (bucket) {
            search = `%${search}%`;
            return this.getRepository(transaction).count({
                where: [
                    { fileName: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                    { fileExtension: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                    { ip: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                    { originalFileName: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                    { album: { name: Like(search) }, bucketToken: Equal(bucket), expires: this.expiresCondition },
                ],
            });
        }
        return this.getRepository(transaction).count({
            where: this.getSearchQuery(search, bucket),
        });
    }

    private getSearchQuery(search: string, bucket?: string): Record<string, FindOperator<unknown>>[] {
        search = `%${search}%`;

        if (bucket) {
            return [
                { fileName: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                { fileExtension: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                { ip: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
                { originalFileName: Like(search), bucketToken: Equal(bucket), expires: this.expiresCondition },
            ];
        }
        return [
            { fileName: Like(search), expires: this.expiresCondition },
            { fileExtension: Like(search), expires: this.expiresCondition },
            { ip: Like(search), expires: this.expiresCondition },
            { originalFileName: Like(search), expires: this.expiresCondition },
        ];
    }

    public getAllEntriesForIp(ip: string, transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getRepository(transaction).find({
            where: {
                ip,
                expires: this.expiresCondition,
            },
        });
    }

    public async incrementViews(token: string, transaction?: EntityManager): Promise<void> {
        await this.getRepository(transaction).increment({ token }, "views", 1);
    }

    public getExpiredFiles(): Promise<FileUploadModel[]> {
        return this.getRepository().find({
            where: {
                expires: LessThan(Date.now()),
            },
        });
    }

    public async getEntriesByBucket(albumToken: string, transaction?: EntityManager): Promise<FileUploadModel[]> {
        const r = await this.getRepository(transaction).find({
            where: {
                albumToken,
            },
            cache: {
                milliseconds: this.cacheTime,
                id: this.generateKey(albumToken),
            },
        });
        this.cachedToken.add(albumToken);
        return r;
    }

    public async clearCache(token: string | string[] | null): Promise<void> {
        if (token !== null) {
            await this.dataSource.queryResultCache?.remove([this.generateKey(token)]);
            if (Array.isArray(token)) {
                for (const token of this.cachedToken) {
                    this.cachedToken.delete(token);
                }
            } else {
                this.cachedToken.delete(token);
            }
        } else {
            const keys: string[] = [];
            for (const token of this.cachedToken) {
                keys.push(this.generateKey(token));
            }
            await this.dataSource.queryResultCache?.remove(keys);
            this.cachedToken.clear();
        }
    }

    private generateKey(entryToken: string | string[] | number | number[]): string {
        return this.h64ToString(`entryCache_${entryToken}`);
    }
}
