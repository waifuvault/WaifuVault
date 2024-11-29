import { Inject, OnInit, Service } from "@tsed/di";
import { FileDao } from "../dao/FileDao.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import Path from "node:path";

@Service()
export class FileRepo implements OnInit {
    private readonly viewCache: Map<string, number> = new Map(); // token to view count

    public constructor(@Inject() private fileDao: FileDao) {}

    public async $onInit(): Promise<void> {
        const entries = await this.fileDao.getAllEntries();
        for (const entry of entries) {
            this.viewCache.set(entry.token, entry.views);
        }
    }

    public saveEntry(entry: FileUploadModel): Promise<FileUploadModel> {
        this.viewCache.set(entry.token, entry.views);
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

    public async incrementViews(token: string): Promise<number> {
        let currentViews = this.viewCache.get(token)!;
        currentViews++;
        this.viewCache.set(token, currentViews);
        await this.fileDao.incrementViews(token);
        return currentViews;
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
        for (const token of tokens) {
            this.viewCache.delete(token);
        }
        return this.fileDao.deleteEntries(tokens);
    }

    public getRecordCount(bucket?: string): Promise<number> {
        return this.fileDao.getRecordCount(bucket);
    }

    public getSearchRecordCount(search: string, bucket?: string): Promise<number> {
        return this.fileDao.getSearchRecordCount(search, bucket);
    }
}
