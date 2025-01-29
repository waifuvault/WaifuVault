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

@Injectable()
export class FileDao extends AbstractTypeOrmDao<FileUploadModel> {
    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, FileUploadModel);
    }

    private readonly relation: { relations: FindOptionsRelations<FileUploadModel> } = {
        relations: {
            bucket: true,
            album: true,
        },
    };

    private get expiresCondition(): FindOperator<number> {
        return Or(MoreThan(Date.now()), IsNull());
    }

    public saveEntry(entry: FileUploadModel, transaction?: EntityManager): Promise<FileUploadModel> {
        return this.getRepository(transaction).save(entry);
    }

    public saveEntries(entries: FileUploadModel[], transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getRepository(transaction).save(entries);
    }

    public getEntry(tokens: string[], transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getRepository(transaction).find({
            where: {
                token: In(tokens),
            },
            ...this.relation,
        });
    }

    public getEntriesFromChecksum(checksum: string, transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getRepository(transaction).findBy({
            checksum,
        });
    }

    public async deleteEntries(tokens: string[], transaction?: EntityManager): Promise<boolean> {
        const deleteResult = await this.getRepository(transaction).delete({
            token: In(tokens),
        });
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
                ...this.relation,
            });
        }

        if (search) {
            return this.getRepository(transaction).find({
                where: this.getSearchQuery(search, bucket),
                order: orderOptions,
                skip: start,
                take: records,
                ...this.relation,
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
                ...this.relation,
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
        return this.getRepository(transaction).findOneBy({
            fileName,
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
            ...this.relation,
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
}
