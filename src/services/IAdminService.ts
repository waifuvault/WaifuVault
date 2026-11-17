import { FileUploadModel } from "../model/db/FileUpload.model.js";
import type { FileSortColumn, SortDirection } from "../utils/typeings.js";

/**
 * An admin service is a service that the admin page will use to be able to render content.
 * there can be multiple sources of data for the admin pages, but this is a minimum requirement for them to function
 */
export interface IAdminService {
    getAllEntries(): Promise<FileUploadModel[]>;
    deleteEntries(ids: number[]): Promise<boolean>;
    getMatchingEntries(
        start: number,
        length: number,
        sortColumn?: FileSortColumn,
        sortDirection?: SortDirection,
        search?: string,
    ): Promise<FileUploadModel[]>;
    getMatchingRecordCount(search?: string): Promise<number>;
    getStatsData(): Promise<FileUploadModel[]>;
}
