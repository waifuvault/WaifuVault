import { PlatformResponse } from "@tsed/common";
import { NotFound } from "@tsed/exceptions";
import {
    DatatableColumn,
    DatatableOrder,
    DatatableSearch,
    IpBlockedAwareFileEntry,
} from "../../../../utils/typeings.js";
import { IAdminService } from "../../../../services/IAdminService.js";
import { BaseRestController } from "../../BaseRestController.js";
import { FileUploadModel } from "../../../../model/db/FileUpload.model.js";
import { IpBlackListRepo } from "../../../../db/repo/IpBlackListRepo.js";
import { StatsModel } from "../../../../model/dto/StatsDto.js";

export abstract class AbstractAdminController extends BaseRestController {
    protected constructor(
        protected adminService: IAdminService,
        protected ipBlackListRepo: IpBlackListRepo,
    ) {
        super();
    }

    protected async mapIpToFileEntries(entries: FileUploadModel[]): Promise<IpBlockedAwareFileEntry[]> {
        const ipBlockedPArr = entries.map(entry => Promise.all([entry, this.ipBlackListRepo.isIpBlocked(entry.ip)]));
        const ipBlockedArr = await Promise.all(ipBlockedPArr);
        return ipBlockedArr.map(([entry, ipBlocked]) => {
            return {
                ipBlocked,
                entry,
            };
        });
    }

    public async getAllEntries(): Promise<IpBlockedAwareFileEntry[]> {
        return this.mapIpToFileEntries(await this.adminService.getAllEntries());
    }

    public async deleteEntries(res: PlatformResponse, ids: number[]): Promise<PlatformResponse> {
        const result = await this.adminService.deleteEntries(ids);
        if (!result) {
            throw new NotFound(`No entry with IDs ${ids.join(", ")} found.`);
        }
        return super.doSuccess(res, `Entries have been deleted.`);
    }

    public async getStatsData(): Promise<StatsModel> {
        const stats = new StatsModel();
        stats.files = await this.mapIpToFileEntries(await this.adminService.getStatsData());
        return stats;
    }

    public abstract getDatatablesEntries(
        draw: number,
        start: number,
        length: number,
        order: DatatableOrder[],
        columns: DatatableColumn[],
        search: DatatableSearch,
    ): Promise<unknown>;
}
