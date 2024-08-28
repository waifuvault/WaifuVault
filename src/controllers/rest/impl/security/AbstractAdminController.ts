import { PlatformResponse } from "@tsed/common";
import { NotFound } from "@tsed/exceptions";
import type { DatatableColumn, DatatableOrder, DatatableSearch } from "../../../../utils/typeings.js";
import { IAdminService } from "../../../../services/IAdminService.js";
import { BaseRestController } from "../../BaseRestController.js";

export abstract class AbstractAdminController extends BaseRestController {
    protected constructor(protected adminService: IAdminService) {
        super();
    }

    public getAllEntries(): Promise<unknown> {
        return this.adminService.getAllEntries();
    }

    public async deleteEntries(res: PlatformResponse, ids: number[]): Promise<unknown> {
        const result = await this.adminService.deleteEntries(ids);
        if (!result) {
            throw new NotFound(`No entry with IDs ${ids.join(", ")} found.`);
        }
        return super.doSuccess(res, `Entries have been deleted.`);
    }

    public getStatsData(): Promise<unknown> {
        return this.adminService.getStatsData();
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
