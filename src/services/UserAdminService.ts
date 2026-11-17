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
import type { BucketFileCount, FileSearchTerm, FileSortColumn, SortDirection } from "../utils/typeings.js";

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
        const allEntries = await this.repo.getAllEntries(undefined, true);
        return allEntries.filter(e => !e.hasExpired);
    }

    public getMatchingEntries(
        start: number,
        length: number,
        sortColumn: FileSortColumn = "id",
        sortDirection: SortDirection = "ASC",
        search = "",
    ): Promise<FileUploadModel[]> {
        return this.repo.getEntriesMatching(this.parseSearch(search), start, length, sortColumn, sortDirection);
    }

    public getMatchingRecordCount(search: string): Promise<number> {
        return this.repo.getMatchingRecordCount(this.parseSearch(search));
    }

    public getBucketFileCounts(): Promise<BucketFileCount[]> {
        return this.repo.getBucketFileCounts();
    }

    private parseSearch(search: string): FileSearchTerm[] {
        return search
            .split(/\s+/)
            .map((token): FileSearchTerm => {
                const exclude = token.startsWith("-");
                const body = exclude ? token.slice(1) : token;
                const field = /^(ip|name):(.*)$/.exec(body);

                if (field?.[1] === "ip") {
                    return { columns: ["ip"], value: field[2], exclude, exact: true };
                }
                if (field?.[1] === "name") {
                    return { columns: ["originalFileName"], value: field[2], exclude, exact: false };
                }
                return {
                    columns: ["fileName", "fileExtension", "ip", "originalFileName"],
                    value: body,
                    exclude,
                    exact: false,
                };
            })
            .filter(term => term.value !== "");
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
