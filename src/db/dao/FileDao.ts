import { Inject, Injectable } from "@tsed/di";
import { AbstractDao } from "./AbstractDao.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import { DataSource, EntityManager, Equal, In, IsNull, Like, MoreThan } from "typeorm";
import { FindOperator } from "typeorm/find-options/FindOperator.js";
import { FindOptionsRelations } from "typeorm/find-options/FindOptionsRelations.js";

@Injectable()
export class FileDao extends AbstractDao<FileUploadModel> {
    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, FileUploadModel);
    }

    private readonly relation: { relations: FindOptionsRelations<FileUploadModel> } = {
        relations: {
            bucket: true,
        },
    };

    public saveEntry(entry: FileUploadModel, transaction?: EntityManager): Promise<FileUploadModel> {
        return this.getRepository(transaction).save(entry);
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
        return this.getRepository(transaction).sum("fileSize", [
            {
                expires: IsNull(),
            },
            {
                expires: MoreThan(Date.now()),
            },
        ]);
    }

    public getAllEntriesOrdered(
        start: number,
        records: number,
        sortColumn?: string,
        sortOrder?: string,
        search?: string,
        transaction?: EntityManager,
    ): Promise<FileUploadModel[]> {
        const orderOptions = sortColumn ? { [sortColumn]: sortOrder } : {};
        if (search) {
            return this.getRepository(transaction).find({
                where: this.getSearchQuery(search),
                order: orderOptions,
                skip: start,
                take: records,
                ...this.relation,
            });
        }
        return this.getRepository(transaction).find({
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
                where: [
                    {
                        expires: IsNull(),
                        bucketToken: Equal(bucket),
                    },
                    {
                        expires: MoreThan(Date.now()),
                        bucketToken: Equal(bucket),
                    },
                ],
            });
        }
        return this.getRepository(transaction).count({
            where: [
                {
                    expires: IsNull(),
                },
                {
                    expires: MoreThan(Date.now()),
                },
            ],
        });
    }

    public getSearchRecordCount(search: string, bucket?: string, transaction?: EntityManager): Promise<number> {
        return this.getRepository(transaction).count({
            where: this.getSearchQuery(search, bucket),
        });
    }

    private getSearchQuery(search: string, bucket?: string): Record<string, FindOperator<string>>[] {
        search = `%${search}%`;
        if (bucket) {
            return [
                { fileName: Like(search), bucketToken: Equal(bucket) },
                { fileExtension: Like(search), bucketToken: Equal(bucket) },
                { ip: Like(search), bucketToken: Equal(bucket) },
                { originalFileName: Like(search), bucketToken: Equal(bucket) },
            ];
        }
        return [
            { fileName: Like(search) },
            { fileExtension: Like(search) },
            { ip: Like(search) },
            { originalFileName: Like(search) },
        ];
    }

    public getAllEntriesForIp(ip: string, transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getRepository(transaction).find({
            where: {
                ip,
            },
            ...this.relation,
        });
    }
}
