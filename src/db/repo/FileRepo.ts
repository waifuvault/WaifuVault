import { Inject, Service } from "@tsed/di";
import { FileDao } from "../dao/FileDao.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import Path from "node:path";
import { ThumbnailCacheRepo } from "./ThumbnailCacheRepo.js";

@Service()
export class FileRepo {
    public constructor(
        @Inject() private fileDao: FileDao,
        @Inject() private thumbnailCacheRepo: ThumbnailCacheRepo,
    ) {}

    public saveEntry(entry: FileUploadModel): Promise<FileUploadModel> {
        return this.fileDao.saveEntry(entry);
    }

    public saveEntries(entries: FileUploadModel[]): Promise<FileUploadModel[]> {
        return this.fileDao.saveEntries(entries);
    }

    public getEntries(tokens: string[], loadRelations = true): Promise<FileUploadModel[]> {
        return this.fileDao.getEntries(tokens, loadRelations);
    }

    public getEntriesByBucket(privateAlbumToken: string): Promise<FileUploadModel[]> {
        return this.fileDao.getEntriesByBucket(privateAlbumToken);
    }

    public getEntryByFileName(fileName: string): Promise<FileUploadModel | null> {
        return this.fileDao.getEntryFileName(Path.parse(fileName).name);
    }

    public getEntryById(id: number): Promise<FileUploadModel | null> {
        return this.fileDao.getEntryById(id);
    }

    public getEntriesFromChecksum(hash: string): Promise<FileUploadModel[]> {
        return this.fileDao.getEntriesFromChecksum(hash);
    }

    public getExpiredFiles(): Promise<FileUploadModel[]> {
        return this.fileDao.getExpiredFiles();
    }

    public getAllEntries(ids: number[] = []): Promise<FileUploadModel[]> {
        return this.fileDao.getAllEntries(ids);
    }

    public getTotalFileSize(): Promise<number | null> {
        // bypass cache
        return this.fileDao.getTotalFileSize();
    }

    public getAllEntriesForIp(ip: string): Promise<FileUploadModel[]> {
        return this.fileDao.getAllEntriesForIp(ip);
    }

    public async incrementViews(token: string): Promise<number> {
        await this.fileDao.incrementViews(token);
        return this.getEntries([token]).then(entries => entries[0].views);
    }

    public getAllEntriesOrdered(
        start: number,
        records: number,
        sortColumn?: string,
        sortDir?: string,
        search?: string,
        bucket?: string,
    ): Promise<FileUploadModel[]> {
        // bypass cache
        return this.fileDao.getAllEntriesOrdered(start, records, sortColumn, sortDir, search, bucket);
    }

    public async deleteEntries(tokens: string[]): Promise<boolean> {
        const entries = await this.getEntries(tokens);
        await this.thumbnailCacheRepo.deleteThumbsIfExist(entries);
        return this.fileDao.deleteEntries(tokens);
    }

    public getRecordCount(bucket?: string): Promise<number> {
        return this.fileDao.getRecordCount(bucket);
    }

    public getSearchRecordCount(search: string, bucket?: string): Promise<number> {
        return this.fileDao.getSearchRecordCount(search, bucket);
    }

    public async clearCache(token: string | string[] | null): Promise<void> {
        await this.fileDao.clearCache(token);
    }

    public getNextAlbumValue(albumToken: string): Promise<number> {
        return this.fileDao.getNextAlbumValue(albumToken);
    }
}
