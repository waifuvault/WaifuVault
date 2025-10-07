import { FileRepo } from "../db/repo/FileRepo.js";
import { Inject, Service } from "@tsed/di";
import { IpBlackListRepo } from "../db/repo/IpBlackListRepo.js";
import { FileService } from "./FileService.js";
import { SettingsDao } from "../db/dao/SettingsDao.js";
import { AbstractAdminService } from "./AbstractAdminService.js";
import { IpBlackListModel } from "../model/db/IpBlackList.model.js";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";
import { BucketRepo } from "../db/repo/BucketRepo.js";
import BucketType from "../model/constants/BucketType.js";

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
        @Inject() private bucketRepo: BucketRepo,
    ) {
        super(ipBlackListRepo, repo, fileService, settingsDao.getSetting(GlobalEnv.BASE_URL));
    }

    public override async getAllEntries(): Promise<FileUploadModel[]> {
        const allEntries = await this.repo.getAllEntries();
        return allEntries.filter(e => !e.hasExpired);
    }

    public override getPagedEntries(
        start: number,
        length: number,
        sortColumn = "id",
        sortDir = "ASC",
        search?: string,
    ): Promise<FileUploadModel[]> {
        return this.repo.getAllEntriesOrdered(start, length, sortColumn, sortDir, search);
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

    public setBucketType(token: string, bucketType: BucketType): Promise<boolean> {
        return this.bucketRepo.setBucketType(token, bucketType);
    }
}
