import { PlatformResponse } from "@tsed/platform-http";
import type { DatatableColumn, DatatableOrder, DatatableSearch } from "../../utils/typeings.js";

export interface IAdminController {
    getAllEntries(): Promise<unknown>;

    deleteEntries(res: PlatformResponse, ids: number[]): Promise<unknown>;

    getStatsData(): Promise<unknown>;

    getDatatablesEntries(
        draw: number,
        start: number,
        length: number,
        order: DatatableOrder[],
        columns: DatatableColumn[],
        search: DatatableSearch,
    ): Promise<unknown>;
}
