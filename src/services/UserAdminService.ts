import { FileRepo } from "../db/repo/FileRepo.js";
import { Inject, Service } from "@tsed/di";
import { IpBlackListRepo } from "../db/repo/IpBlackListRepo.js";
import { FileService } from "./FileService.js";
import { AdminFileEntryDto } from "../model/dto/AdminFileEntryDto.js";
import { SettingsDao } from "../db/dao/SettingsDao.js";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { AbstractAdminService } from "./AbstractAdminService.js";
import { IpBlackListModel } from "../model/db/IpBlackList.model.js";

/**
 * This is an admin service that will work when logged in as a user
 */
@Service()
export class UserAdminService extends AbstractAdminService {
    public constructor(
        @Inject() repo: FileRepo,
        @Inject() fileService: FileService,
        @Inject() settingsDao: SettingsDao,
        @Inject() ipBlackListRepo: IpBlackListRepo,
    ) {
        super(ipBlackListRepo, repo, fileService, settingsDao.getSetting(GlobalEnv.BASE_URL)!);
    }

    public override async getAllEntries(): Promise<AdminFileEntryDto[]> {
        const allEntries = await this.repo.getAllEntries();
        return this.buildFileEntryDtos(allEntries.filter(entry => !entry.hasExpired));
    }

    public override async getPagedEntries(
        start: number,
        length: number,
        sortColumn = "id",
        sortDir = "ASC",
        search?: string,
    ): Promise<AdminFileEntryDto[]> {
        const entries = await this.repo.getAllEntriesOrdered(start, length, sortColumn, sortDir, search);
        return this.buildFileEntryDtos(entries.filter(entry => !entry.hasExpired));
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
}
