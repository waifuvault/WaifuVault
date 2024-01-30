import {Inject, Injectable} from "@tsed/di";
import {AbstractDao} from "./AbstractDao";
import {FileUploadModel} from "../../model/db/FileUpload.model";
import {SQLITE_DATA_SOURCE} from "../../model/di/tokens";
import {Logger} from "@tsed/logger";
import {DataSource, EntityManager} from "typeorm";

@Injectable()
export class FileDao extends AbstractDao<FileUploadModel> {

    @Inject()
    private logger: Logger;

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

    public getEntryFromChecksum(checksum: string, transaction?: EntityManager): Promise<FileUploadModel | null> {
        return this.getEntityManager(transaction).findOneBy({
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
