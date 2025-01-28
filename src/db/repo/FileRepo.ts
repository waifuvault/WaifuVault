import { Inject, Service } from "@tsed/di";
import { FileDao } from "../dao/FileDao.js";
import { AlbumDao } from "../dao/AlbumDao.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import Path from "node:path";
import { ObjectUtils } from "../../utils/Utils.js";

@Service()
export class FileRepo {
    private readonly entryCache: Map<string, FileUploadModel> = new Map();

    public constructor(
        @Inject() private fileDao: FileDao,
        @Inject() private albumDao: AlbumDao,
    ) {}

    public async saveEntry(entry: FileUploadModel): Promise<FileUploadModel> {
        const res = await this.fileDao.saveEntry(entry);
        this.entryCache.set(entry.token, res);
        return res;
    }

    public async saveEntries(entries: FileUploadModel[]): Promise<FileUploadModel[]> {
        const res = await this.fileDao.saveEntries(entries);
        for (const entry of res) {
            this.entryCache.set(entry.token, entry);
        }
        return res;
    }

    public async getEntry(tokens: string[]): Promise<FileUploadModel[]> {
        const ret: FileUploadModel[] = [];
        const tokensClone = [...tokens];
        ObjectUtils.removeObjectFromArray(tokensClone, token => {
            const fromCache = this.entryCache.get(token);
            if (fromCache) {
                ret.push(fromCache);
                return true;
            }
            return false;
        });
        if (tokensClone.length > 0) {
            const result = await this.fileDao.getEntry(tokensClone);
            ret.push(...result);
            for (const fileUploadModel of result) {
                this.entryCache.set(fileUploadModel.token, fileUploadModel);
            }
        }
        return ret;
    }

    public async getEntryByFileName(fileName: string): Promise<FileUploadModel | null> {
        const fromCache = this.obtainOneFromCacheBasedOnProp("fileName", fileName);
        if (fromCache) {
            return Promise.resolve(fromCache);
        }
        const res = await this.fileDao.getEntryFileName(Path.parse(fileName).name);
        if (!res) {
            return null;
        }
        this.entryCache.set(res.token, res);
        return res;
    }

    public async getEntriesFromChecksum(hash: string): Promise<FileUploadModel[]> {
        const entriesFromChecksum = await this.fileDao.getEntriesFromChecksum(hash);
        for (const entry of entriesFromChecksum) {
            this.entryCache.set(entry.token, entry);
        }
        return entriesFromChecksum;
    }

    public async getExpiredFiles(): Promise<FileUploadModel[]> {
        // bypass cache
        const fileUploadModels: FileUploadModel[] = await this.fileDao.getExpiredFiles();
        for (const fileUploadModel of fileUploadModels) {
            this.entryCache.set(fileUploadModel.token, fileUploadModel);
        }
        return fileUploadModels;
    }

    public async getAllEntries(ids: number[] = []): Promise<FileUploadModel[]> {
        const fileUploadModels: FileUploadModel[] = await this.fileDao.getAllEntries(ids);

        this.invalidateCache();
        for (const fileUploadModel of fileUploadModels) {
            this.entryCache.set(fileUploadModel.token, fileUploadModel);
        }
        return fileUploadModels;
    }

    public getTotalFileSize(): Promise<number | null> {
        // bypass cache
        return this.fileDao.getTotalFileSize();
    }

    public async getAllEntriesForIp(ip: string): Promise<FileUploadModel[]> {
        // bypass cache
        const fileUploadModels: FileUploadModel[] = await this.fileDao.getAllEntriesForIp(ip);
        for (const fileUploadModel of fileUploadModels) {
            this.entryCache.set(fileUploadModel.token, fileUploadModel);
        }
        return fileUploadModels;
    }

    public async incrementViews(token: string): Promise<number> {
        await this.fileDao.incrementViews(token);
        const entryCache = this.entryCache.get(token);
        if (entryCache) {
            // update the cache too
            entryCache.views = ++entryCache.views;
            this.entryCache.set(token, entryCache);
            return entryCache.views;
        } else {
            return this.getEntry([token]).then(entries => entries[0].views);
        }
    }

    public async getAllEntriesOrdered(
        start: number,
        records: number,
        sortColumn?: string,
        sortDir?: string,
        search?: string,
        bucket?: string,
    ): Promise<FileUploadModel[]> {
        // bypass cache
        const album = await this.albumDao.getAlbumByName(search ?? "", bucket ?? "");
        const albumToken = album?.albumToken;
        return this.fileDao.getAllEntriesOrdered(start, records, sortColumn, sortDir, search, bucket, albumToken);
    }

    public deleteEntries(tokens: string[]): Promise<boolean> {
        for (const token of tokens) {
            this.entryCache.delete(token);
        }
        return this.fileDao.deleteEntries(tokens);
    }

    public getRecordCount(bucket?: string): Promise<number> {
        return this.fileDao.getRecordCount(bucket);
    }

    public getSearchRecordCount(search: string, bucket?: string): Promise<number> {
        return this.fileDao.getSearchRecordCount(search, bucket);
    }

    private obtainOneFromCacheBasedOnProp(prop: keyof FileUploadModel, value: string): FileUploadModel | null {
        for (const [, entry] of this.entryCache) {
            if (entry[prop] === value) {
                return entry;
            }
        }
        return null;
    }

    public invalidateCache(tokens?: string[]): void {
        if (tokens) {
            for (const token of tokens) {
                this.entryCache.delete(token);
            }
        } else {
            this.entryCache.clear();
        }
    }
}
