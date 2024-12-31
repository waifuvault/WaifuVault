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
import { AdminFileEntryDto } from "../../../../model/dto/AdminFileEntryDto.js";
import { StatsDto } from "../../../../model/dto/StatsDto.js";
import { IpBlackListRepo } from "../../../../db/repo/IpBlackListRepo.js";

export abstract class AbstractAdminController extends BaseRestController {
    protected constructor(
        protected adminService: IAdminService,
        protected ipBlackListRepo: IpBlackListRepo,
    ) {
        super();
    }

    protected async buildFileEntryDtos(entries: FileUploadModel[]): Promise<AdminFileEntryDto[]> {
        const ipBlockedPArr = entries.map(entry => Promise.all([entry, this.ipBlackListRepo.isIpBlocked(entry.ip)]));
        const ipBlockedArr = await Promise.all(ipBlockedPArr);
        return Promise.all(
            ipBlockedArr.map(([entry, ipBlocked]) => {
                const ipBlockedAwareEntry: IpBlockedAwareFileEntry = {
                    ipBlocked,
                    entry,
                };
                return AdminFileEntryDto.fromModel(ipBlockedAwareEntry);
            }),
        );
    }

    public async getAllEntries(): Promise<unknown> {
        return this.buildFileEntryDtos(await this.adminService.getAllEntries());
    }

    public async deleteEntries(res: PlatformResponse, ids: number[]): Promise<unknown> {
        const result = await this.adminService.deleteEntries(ids);
        if (!result) {
            throw new NotFound(`No entry with IDs ${ids.join(", ")} found.`);
        }
        return super.doSuccess(res, `Entries have been deleted.`);
    }

    public async getStatsData(): Promise<unknown> {
        return StatsDto.buildStats(await this.buildFileEntryDtos(await this.adminService.getStatsData()));
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
