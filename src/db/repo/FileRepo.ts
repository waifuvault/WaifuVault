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

    public getTotalFileSize(): Promise<number | null> {
        return this.fileDao.getTotalFileSize();
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
        bucket?: string,
    ): Promise<FileUploadModel[]> {
        return this.fileDao.getAllEntriesOrdered(start, records, sortColumn, sortDir, search, bucket);
    }

    public deleteEntries(tokens: string[]): Promise<boolean> {
        return this.fileDao.deleteEntries(tokens);
    }

    public getRecordCount(bucket?: string): Promise<number> {
        return this.fileDao.getRecordCount(bucket);
    }

    public getSearchRecordCount(search: string, bucket?: string): Promise<number> {
        return this.fileDao.getSearchRecordCount(search, bucket);
    }
}
