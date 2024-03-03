import { Inject, Service } from "@tsed/di";
import { FileDao } from "../dao/FileDao.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import * as Path from "node:path";

@Service()
export class FileRepo {
    public constructor(@Inject() private fileDao: FileDao) {}

    public saveEntry(entry: FileUploadModel): Promise<FileUploadModel> {
        return this.fileDao.saveEntry(entry);
    }

    public getEntry(tokens: string[]): Promise<FileUploadModel[]> {
        return this.fileDao.getEntry(tokens);
    }

    public getEntryFileName(fileName: string): Promise<FileUploadModel | null> {
        return this.fileDao.getEntryFileName(Path.parse(fileName).name);
    }

    public getEntriesFromChecksum(hash: string): Promise<FileUploadModel[]> {
        return this.fileDao.getEntriesFromChecksum(hash);
    }

    public getAllEntries(ids: number[] = []): Promise<FileUploadModel[]> {
        return this.fileDao.getAllEntries(ids);
    }

    public getAllEntriesForIp(ip: string): Promise<FileUploadModel[]> {
        return this.fileDao.getAllEntriesForIp(ip);
    }

    public getAllEntriesOrdered(
        start: number,
        records: number,
        sortColumn?: string,
        sortDir?: string,
        search?: string,
    ): Promise<FileUploadModel[]> {
        return this.fileDao.getAllEntriesOrdered(start, records, sortColumn, sortDir, search);
    }

    public deleteEntries(tokens: string[]): Promise<boolean> {
        return this.fileDao.deleteEntries(tokens);
    }

    public getRecordCount(): Promise<number> {
        return this.fileDao.getRecordCount();
    }

    public getSearchRecordCount(search: string): Promise<number> {
        return this.fileDao.getSearchRecordCount(search);
    }
}
