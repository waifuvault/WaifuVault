import { Constant, Inject, Service } from "@tsed/di";
import { FileRepo } from "../db/repo/FileRepo.js";
import { IpBlackListRepo } from "../db/repo/IpBlackListRepo.js";
import { IpBlackListModel } from "../model/db/IpBlackList.model.js";
import { FileService } from "./FileService.js";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { FileEntryDto } from "../model/dto/FileEntryDto.js";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { IpBlockedAwareFileEntry } from "../utils/typeings.js";
import { StatsDto } from "../model/dto/StatsDto.js";

@Service()
export class AdminService {
    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private ipBlackListRepo: IpBlackListRepo,
        @Inject() private fileService: FileService,
    ) {}

    @Constant(GlobalEnv.BASE_URL)
    private readonly baseUrl: string;

    public getStatsData(entries: FileEntryDto[]): Promise<StatsDto> {
        return StatsDto.buildStats(entries);
    }

    public async getAllEntries(): Promise<FileEntryDto[]> {
        const allEntries = await this.repo.getAllEntries();
        return this.buildFileEntryDtos(allEntries);
    }

    public async getPagedEntries(
        start: number,
        length: number,
        sortColumn = "id",
        sortDir = "ASC",
        search?: string,
    ): Promise<FileEntryDto[]> {
        const entries = await this.repo.getAllEntriesOrdered(start, length, sortColumn, sortDir, search);
        return this.buildFileEntryDtos(entries);
    }

    private async buildFileEntryDtos(entries: FileUploadModel[]): Promise<FileEntryDto[]> {
        const ipBlockedPArr = entries.map(entry => Promise.all([entry, this.ipBlackListRepo.isIpBlocked(entry.ip)]));
        const ipBlockedArr = await Promise.all(ipBlockedPArr);
        return ipBlockedArr.map(([entry, ipBlocked]) => {
            const ipBlockedAwareEntry: IpBlockedAwareFileEntry = {
                ipBlocked,
                entry,
            };
            return FileEntryDto.fromModel(ipBlockedAwareEntry, this.baseUrl);
        });
    }

    public getFileRecordCount(): Promise<number> {
        return this.repo.getRecordCount();
    }

    public getFileSearchRecordCount(search: string): Promise<number> {
        return this.repo.getSearchRecordCount(search);
    }

    public getAllBlockedIps(): Promise<IpBlackListModel[]> {
        return this.ipBlackListRepo.getAllBlockedIps();
    }

    public async blockIp(ip: string, removeRelatedData: boolean): Promise<void> {
        await this.ipBlackListRepo.addIpBlock(ip);
        if (removeRelatedData) {
            const matchingEntries = await this.repo.getAllEntriesForIp(ip);
            const tokens = matchingEntries.map(entry => entry.token);
            await this.fileService.processDelete(tokens);
        }
    }

    public removeBlockedIps(ips: string[]): Promise<boolean> {
        return this.ipBlackListRepo.removeBlockedIps(ips);
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
