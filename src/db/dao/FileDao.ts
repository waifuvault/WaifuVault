import {Inject, Injectable} from "@tsed/di";
import {AbstractDao} from "./AbstractDao.js";
import {FileUploadModel} from "../../model/db/FileUpload.model.js";
import {SQLITE_DATA_SOURCE} from "../../model/di/tokens.js";
import {DataSource, EntityManager} from "typeorm";

@Injectable()
export class FileDao extends AbstractDao<FileUploadModel> {

    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, FileUploadModel);
    }

    public saveEntry(entry: FileUploadModel, transaction?: EntityManager): Promise<FileUploadModel> {
        return this.getEntityManager(transaction).save(entry);
    }

    public getEntry(token: string, transaction?: EntityManager): Promise<FileUploadModel | null> {
        return this.getEntityManager(transaction).findOneBy({
            token
        });
    }

    public getEntriesFromChecksum(checksum: string, transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getEntityManager(transaction).findBy({
            checksum
        });
    }

    public async deleteEntry(token: string, transaction?: EntityManager): Promise<boolean> {
        const deleteResult = await this.getEntityManager(transaction).delete({
            token
        });
        return deleteResult.affected === 1;
    }

    public getAllEntries(transaction?: EntityManager): Promise<FileUploadModel[]> {
        return this.getEntityManager(transaction).find();
    }

}
