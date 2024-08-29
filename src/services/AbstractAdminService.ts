import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { AdminFileEntryDto } from "../model/dto/AdminFileEntryDto.js";
import { IpBlockedAwareFileEntry } from "../utils/typeings.js";
import { IpBlackListRepo } from "../db/repo/IpBlackListRepo.js";
import { StatsDto } from "../model/dto/StatsDto.js";
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

    public async getStatsData(): Promise<StatsDto> {
        const entries = await this.getAllEntries();
        return StatsDto.buildStats(entries);
    }

    protected async buildFileEntryDtos(entries: FileUploadModel[]): Promise<AdminFileEntryDto[]> {
        const ipBlockedPArr = entries.map(entry => Promise.all([entry, this.ipBlackListRepo.isIpBlocked(entry.ip)]));
        const ipBlockedArr = await Promise.all(ipBlockedPArr);
        return ipBlockedArr.map(([entry, ipBlocked]) => {
            const ipBlockedAwareEntry: IpBlockedAwareFileEntry = {
                ipBlocked,
                entry,
            };
            return AdminFileEntryDto.fromModel(ipBlockedAwareEntry, this.baseUrl);
        });
    }

    public abstract getAllEntries(): Promise<AdminFileEntryDto[]>;
    public abstract getPagedEntries(
        start: number,
        length: number,
        sortColumn: string,
        sortDir: string,
        search?: string,
    ): Promise<AdminFileEntryDto[]>;

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
