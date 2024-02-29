import {Inject, Injectable} from "@tsed/di";
import {AbstractDao} from "./AbstractDao.js";
import {FileUploadModel} from "../../model/db/FileUpload.model.js";
import {SQLITE_DATA_SOURCE} from "../../model/di/tokens.js";
import {DataSource, EntityManager, In, Like} from "typeorm";
import {FindOperator} from "typeorm/find-options/FindOperator.js";

@Injectable()
export class FileDao extends AbstractDao<FileUploadModel> {

    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, FileUploadModel);
    }

    public saveEntry(entry: FileUploadModel, transaction?: EntityManager): Promise<FileUploadModel> {
        return this.getRepository(transaction).save(entry);
    }

    public getEntry(tokens: string[], transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getRepository(transaction).findBy({
            token: In(tokens)
        });
    }

    public getRawSQL(query: string, transaction?: EntityManager): Promise<unknown> {
        return this.getRepository(transaction).query(query);
    }

    public getEntryFromEpoch(epoch: number, transaction?: EntityManager): Promise<FileUploadModel | null> {
        return this.getRepository(transaction).findOneBy({});
    }

    public getEntriesFromChecksum(checksum: string, transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getRepository(transaction).findBy({
            checksum
        });
    }

    public async deleteEntries(tokens: string[], transaction?: EntityManager): Promise<boolean> {
        const deleteResult = await this.getRepository(transaction).delete({
            token: In(tokens)
        });
        return deleteResult.affected === tokens.length;
    }

    public getAllEntries(ids: number[] = [], transaction?: EntityManager): Promise<FileUploadModel[]> {
        if (ids.length > 0) {
            return this.getRepository(transaction).findBy({
                id: In(ids)
            });
        }
        return this.getRepository(transaction).find();
    }

    public getAllEntriesOrdered(start: number, records: number, sortColumn?: string, sortOrder?: string, search?: string, transaction?: EntityManager): Promise<FileUploadModel[]> {
        const orderOptions = sortColumn ? {[sortColumn]: sortOrder} : {};
        if (search) {
            return this.getRepository(transaction).find({
                where: this.getSearchQuery(search),
                order: orderOptions,
                skip: start,
                take: records
            });
        }
        return this.getRepository(transaction).find({
            order: orderOptions,
            skip: start,
            take: records
        });
    }

    public getEntryFileName(fileName: string, transaction?: EntityManager): Promise<FileUploadModel | null> {
        return this.getRepository(transaction).findOneBy({
            fileName
        });
    }

    public getRecordCount(transaction?: EntityManager): Promise<number> {
        return this.getRepository(transaction).count();
    }

    public getSearchRecordCount(search: string, transaction?: EntityManager): Promise<number> {
        return this.getRepository(transaction).count({
            where: this.getSearchQuery(search)
        });
    }

    private getSearchQuery(search: string): Record<string, FindOperator<string>>[] {
        search = `%${search}%`;
        return [
            {fileName: Like(search)},
            {fileExtension: Like(search)},
            {ip: Like(search)},
            {originalFileName: Like(search)}
        ];
    }

    public getAllEntriesForIp(ip: string, transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getRepository(transaction).findBy({
            ip
        });
    }
}
