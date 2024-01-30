import {Inject, Service} from "@tsed/di";
import {FileDao} from "../dao/FileDao";
import {FileUploadModel} from "../../model/db/FileUpload.model";

@Service()
export class FileRepo {

    @Inject()
    private fileDao: FileDao;

    public saveEntry(entry: FileUploadModel): Promise<FileUploadModel> {
        return this.fileDao.saveEntry(entry);
    }

    public getEntry(token: string): Promise<FileUploadModel | null> {
        return this.fileDao.getEntry(token);
    }

    public getEntryFromChecksum(hash: string): Promise<FileUploadModel | null> {
        return this.fileDao.getEntryFromChecksum(hash);
    }

    public getAllEntries(): Promise<FileUploadModel[]> {
        return this.fileDao.getAllEntries();
    }

    public deleteEntry(token: string): Promise<boolean> {
        return this.fileDao.deleteEntry(token);
    }

}
