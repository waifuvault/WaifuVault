import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { IpBlackListRepo } from "../db/repo/IpBlackListRepo.js";
import { IAdminService } from "./IAdminService.js";
import { FileRepo } from "../db/repo/FileRepo.js";
import { FileService } from "./FileService.js";

export abstract class AbstractAdminService implements IAdminService {
    protected constructor(
        protected ipBlackListRepo: IpBlackListRepo,
        protected repo: FileRepo,
        protected fileService: FileService,
        protected baseUrl: string,
    ) {}

    public getStatsData(): Promise<FileUploadModel[]> {
        return this.getAllEntries();
    }

    public abstract getAllEntries(): Promise<FileUploadModel[]>;
    public abstract getPagedEntries(
        start: number,
        length: number,
        sortColumn: string,
        sortDir: string,
        search?: string,
    ): Promise<FileUploadModel[]>;

    public getFileRecordCount(): Promise<number> {
        return this.repo.getRecordCount();
    }

    public getFileSearchRecordCount(search: string): Promise<number> {
        return this.repo.getSearchRecordCount(search);
    }

    public async deleteEntries(ids: number[]): Promise<boolean> {
        const matchingEntries = await this.repo.getAllEntries(ids);
        if (matchingEntries.length === 0) {
            return false;
        }
        const tokensToDelete = matchingEntries.map(entry => entry.token);
        await this.fileService.processDelete(tokensToDelete);
        return true;
    }
}
