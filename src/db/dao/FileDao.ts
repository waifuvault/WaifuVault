import { Inject, Injectable } from "@tsed/di";
import { AbstractTypeOrmDao } from "./AbstractTypeOrmDao.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import {
    DataSource,
    EntityManager,
    FindOptionsRelations,
    In,
    IsNull,
    LessThan,
    MoreThan,
    Or,
    SelectQueryBuilder,
} from "typeorm";
import { FindOperator } from "typeorm/find-options/FindOperator.js";
import { AfterInit } from "@tsed/platform-http";
import xxhash from "xxhash-wasm";
import { TimedSet } from "../../utils/timedSet/TimedSet.js";
import type {
    BucketFileCount,
    FileSearchColumn,
    FileSearchTerm,
    FileSortColumn,
    SortDirection,
} from "../../utils/typeings.js";

@Injectable()
export class FileDao extends AbstractTypeOrmDao<FileUploadModel> implements AfterInit {
    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, FileUploadModel);
    }

    private readonly cacheTime = 60000;

    private h64ToString: (input: string, seed?: bigint) => string;
    private readonly cachedToken: TimedSet<string | number> = new TimedSet(this.cacheTime);
    private readonly cachedFileNames: TimedSet<string> = new TimedSet(this.cacheTime);

    private readonly relation: { relations: FindOptionsRelations<FileUploadModel> } = {
        relations: {
            bucket: true,
            album: true,
        },
    };

    private readonly notExpiredCondition = "(file.expires > :now OR file.expires IS NULL)";

    private readonly searchColumns: Record<FileSearchColumn, string> = {
        fileName: "file.fileName",
        fileExtension: "file.fileExtension",
        ip: "file.ip",
        originalFileName: "file.originalFileName",
        albumName: "album.name",
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
        let r: FileUploadModel[];
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

    public getEntriesFromChecksum(
        checksum: string,
        bucket?: string,
        transaction?: EntityManager,
    ): Promise<FileUploadModel[]> {
        const whereCondition = bucket ? { checksum, bucketToken: bucket } : { checksum, bucketToken: IsNull() };
        return this.getRepository(transaction).find({
            where: whereCondition,
        });
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

    public getAllEntries(
        ids?: number[],
        loadRelations = false,
        transaction?: EntityManager,
    ): Promise<FileUploadModel[]> {
        const relations = loadRelations ? { relations: { album: true } } : {};
        if (ids === undefined) {
            return this.getRepository(transaction).find({
                ...relations,
            });
        }
        return this.getRepository(transaction).find({
            where: {
                id: In(ids),
            },
            ...relations,
        });
    }

    public getTotalFileSize(transaction?: EntityManager): Promise<number | null> {
        return this.getRepository(transaction).sum("fileSize", {
            expires: this.expiresCondition,
        });
    }

    public async getEntryFileName(fileName: string, transaction?: EntityManager): Promise<FileUploadModel | null> {
        const r = await this.getRepository(transaction).findOne({
            where: {
                fileName,
            },
            cache: {
                milliseconds: this.cacheTime,
                id: this.generateFileNameKey(fileName),
            },
        });
        this.cachedFileNames.add(fileName);
        return r;
    }

    public getRecordCount(transaction?: EntityManager): Promise<number> {
        return this.getRepository(transaction).count({
            where: { expires: this.expiresCondition },
        });
    }

    public getEntriesMatching(
        terms: FileSearchTerm[],
        start: number,
        records: number,
        sortColumn: FileSortColumn,
        sortDirection: SortDirection,
        bucket?: string,
        transaction?: EntityManager,
    ): Promise<FileUploadModel[]> {
        return this.getMatchingQuery(terms, bucket, transaction)
            .orderBy(`file.${sortColumn}`, sortDirection)
            .addOrderBy("file.id", sortDirection)
            .skip(start)
            .take(records)
            .getMany();
    }

    public getMatchingRecordCount(
        terms: FileSearchTerm[],
        bucket?: string,
        transaction?: EntityManager,
    ): Promise<number> {
        return this.getMatchingQuery(terms, bucket, transaction).getCount();
    }

    public async getBucketFileCounts(transaction?: EntityManager): Promise<BucketFileCount[]> {
        const counts = await this.getRepository(transaction)
            .createQueryBuilder("file")
            .select("file.bucketToken", "token")
            .addSelect("COUNT(*)", "fileCount")
            .where("file.bucketToken IS NOT NULL")
            .andWhere(this.notExpiredCondition, { now: Date.now() })
            .groupBy("file.bucketToken")
            .getRawMany<{ token: string; fileCount: string | number }>();

        return counts.map(count => ({ token: count.token, fileCount: Number(count.fileCount) }));
    }

    private getMatchingQuery(
        terms: FileSearchTerm[],
        bucket?: string,
        transaction?: EntityManager,
    ): SelectQueryBuilder<FileUploadModel> {
        const query = this.getRepository(transaction)
            .createQueryBuilder("file")
            .leftJoinAndSelect("file.album", "album")
            .where(this.notExpiredCondition, { now: Date.now() });

        if (bucket !== undefined) {
            query.andWhere("file.bucketToken = :bucket", { bucket });
        }

        for (const [index, term] of terms.entries()) {
            const parameter = `term${index}`;
            const value = term.value.toLowerCase();
            const pattern = term.exact ? value : `%${value.replace(/[\\%_]/g, "\\$&")}%`;
            const comparison = term.exact ? `= :${parameter}` : `LIKE :${parameter} ESCAPE '\\'`;
            const matches = term.columns
                .map(column => `LOWER(COALESCE(${this.searchColumns[column]}, '')) ${comparison}`)
                .join(" OR ");

            query.andWhere(term.exclude ? `NOT (${matches})` : `(${matches})`, { [parameter]: pattern });
        }

        return query;
    }

    public getAllEntriesForIp(ip: string, transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getRepository(transaction).find({
            where: {
                ip,
                expires: this.expiresCondition,
            },
        });
    }

    public getEntryById(id: number, transaction?: EntityManager): Promise<FileUploadModel | null> {
        return this.getRepository(transaction).findOne({
            where: {
                id,
                expires: this.expiresCondition,
            },
        });
    }

    public async incrementViews(token: string, transaction?: EntityManager): Promise<void> {
        await this.getRepository(transaction).increment({ token }, "views", 1);
    }

    public getExpiredFiles(transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getRepository(transaction).find({
            where: {
                expires: LessThan(Date.now()),
            },
        });
    }

    public async getNextAlbumValue(albumToken: string, transaction?: EntityManager): Promise<number> {
        const maxOrderResult = await this.getRepository(transaction)
            .createQueryBuilder("file")
            .select('COALESCE(MAX(file."addedToAlbumOrder"), 0)', "maxOrder")
            .where('file."albumToken" = :albumToken', { albumToken })
            .getRawOne();

        return Number.parseInt(maxOrderResult.maxOrder) + 1;
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
        await this.clearFileNameCache();
        if (token !== null) {
            if (Array.isArray(token)) {
                const keys = token.map(t => this.generateKey(t));
                if (keys.length > 0) {
                    await this.dataSource.queryResultCache?.remove(keys);
                }
                for (const t of token) {
                    this.cachedToken.delete(t);
                }
            } else {
                await this.dataSource.queryResultCache?.remove([this.generateKey(token)]);
                this.cachedToken.delete(token);
            }
        } else {
            const keys: string[] = [];
            for (const token of this.cachedToken) {
                keys.push(this.generateKey(token));
            }
            if (keys.length > 0) {
                await this.dataSource.queryResultCache?.remove(keys);
            }
            this.cachedToken.clear();
        }
    }

    private async clearFileNameCache(): Promise<void> {
        const keys: string[] = [];
        for (const fileName of this.cachedFileNames) {
            keys.push(this.generateFileNameKey(fileName));
        }
        if (keys.length > 0) {
            await this.dataSource.queryResultCache?.remove(keys);
        }
        this.cachedFileNames.clear();
    }

    private generateKey(entryToken: string | string[] | number | number[]): string {
        return this.h64ToString(`entryCache_v2_${entryToken}`);
    }

    private generateFileNameKey(fileName: string): string {
        return this.h64ToString(`entryFileNameCache_v2_${fileName}`);
    }

    public async removeDuplicates(transaction?: EntityManager): Promise<FileUploadModel[]> {
        const repository = this.getRepository(transaction);

        // For bucketed files: find duplicates by checksum within each bucket
        const bucketedDuplicatesQuery = repository
            .createQueryBuilder("file")
            .select("file.checksum")
            .addSelect("file.bucketToken")
            .addSelect("COUNT(*)", "count")
            .where("file.bucketToken IS NOT NULL")
            .groupBy("file.checksum, file.bucketToken")
            .having("COUNT(*) > 1");

        // For non-bucketed files: find duplicates by checksum AND IP
        const nonBucketedDuplicatesQuery = repository
            .createQueryBuilder("file")
            .select("file.checksum")
            .addSelect("file.ip")
            .addSelect("COUNT(*)", "count")
            .where("file.bucketToken IS NULL")
            .groupBy("file.checksum, file.ip")
            .having("COUNT(*) > 1");

        const [bucketedDuplicates, nonBucketedDuplicates] = await Promise.all([
            bucketedDuplicatesQuery.getRawMany(),
            nonBucketedDuplicatesQuery.getRawMany(),
        ]);

        if (bucketedDuplicates.length === 0 && nonBucketedDuplicates.length === 0) {
            return [];
        }

        const deletedRecords: FileUploadModel[] = [];

        // Handle bucketed duplicates
        for (const { file_checksum: checksum, file_bucketToken: bucketToken } of bucketedDuplicates) {
            const recordsWithChecksum = await repository.find({
                where: { checksum, bucketToken },
                order: { id: "ASC" },
            });

            if (recordsWithChecksum.length > 1) {
                const recordsToDelete = recordsWithChecksum.slice(1);
                const tokensToDelete = recordsToDelete.map(record => record.token);

                deletedRecords.push(...recordsToDelete);

                await repository.delete({
                    token: In(tokensToDelete),
                });
            }
        }

        // Handle non-bucketed duplicates
        for (const { file_checksum: checksum, file_ip: ip } of nonBucketedDuplicates) {
            const recordsWithChecksum = await repository.find({
                where: { checksum, bucketToken: IsNull(), ip: ip === null ? IsNull() : ip },
                order: { id: "ASC" },
            });

            if (recordsWithChecksum.length > 1) {
                const recordsToDelete = recordsWithChecksum.slice(1);
                const tokensToDelete = recordsToDelete.map(record => record.token);

                deletedRecords.push(...recordsToDelete);

                await repository.delete({
                    token: In(tokensToDelete),
                });
            }
        }

        // Clear cache after deletion
        await this.clearCache(deletedRecords.map(record => record.token));

        return deletedRecords;
    }
}
