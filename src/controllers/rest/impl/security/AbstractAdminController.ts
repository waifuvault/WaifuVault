import { PlatformResponse } from "@tsed/platform-http";
import { BadRequest, NotFound } from "@tsed/exceptions";
import {
    AdminDataTaleEntryModel,
    DatatableColumn,
    DatatableOrder,
    DatatableSearch,
    FileSortColumn,
    IpBlockedAwareFileEntry,
    SortDirection,
} from "../../../../utils/typeings.js";
import { IAdminService } from "../../../../services/IAdminService.js";
import { BaseRestController } from "../../BaseRestController.js";
import { FileUploadModel } from "../../../../model/db/FileUpload.model.js";
import { IpBlackListRepo } from "../../../../db/repo/IpBlackListRepo.js";
import { StatsModel } from "../../../../model/dto/StatsDto.js";

export abstract class AbstractAdminController extends BaseRestController {
    private readonly sortableColumns: FileSortColumn[] = [
        "id",
        "originalFileName",
        "createdAt",
        "fileSize",
        "fileExtension",
        "addedToAlbumOrder",
    ];

    private readonly sortDirections: SortDirection[] = ["ASC", "DESC"];

    protected constructor(
        protected adminService: IAdminService,
        protected ipBlackListRepo: IpBlackListRepo,
    ) {
        super();
    }

    protected async mapIpToFileEntries(entries: FileUploadModel[]): Promise<IpBlockedAwareFileEntry[]> {
        const blockedIps = await this.ipBlackListRepo.getAllBlockedIps();
        const blockedIpSet = new Set(blockedIps.map(blocked => blocked.ip));

        return entries.map(entry => {
            return {
                ipBlocked: !!entry.ip && blockedIpSet.has(entry.ip),
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

    public async getDatatablesEntries(
        draw: number,
        start: number,
        length: number,
        order: DatatableOrder[],
        columns: DatatableColumn[],
        search: DatatableSearch,
    ): Promise<AdminDataTaleEntryModel> {
        const searchVal = search ? search.value : undefined;
        const requestedColumn = order && columns ? columns[order[0]?.column ?? 0]?.data : undefined;
        const requestedDirection = order && columns ? order[0]?.dir.toUpperCase() : undefined;
        const sortColumn = this.sortableColumns.find(column => column === requestedColumn);
        const sortDirection = this.sortDirections.find(direction => direction === requestedDirection);

        if (requestedColumn !== undefined && sortColumn === undefined) {
            throw new BadRequest(`Cannot sort by ${requestedColumn}`);
        }
        if (requestedDirection !== undefined && sortDirection === undefined) {
            throw new BadRequest(`Invalid sort direction ${requestedDirection}`);
        }

        const files = await this.adminService.getMatchingEntries(start, length, sortColumn, sortDirection, searchVal);
        const data = await this.mapIpToFileEntries(files);
        const records = await this.adminService.getMatchingRecordCount(searchVal);

        return {
            draw: draw,
            recordsTotal: records,
            recordsFiltered: records,
            data: data,
        };
    }
}
