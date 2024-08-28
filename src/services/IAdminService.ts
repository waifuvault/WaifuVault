import { FileEntryDto } from "../model/dto/FileEntryDto.js";
import { StatsDto } from "../model/dto/StatsDto.js";

/**
 * An admin service is a service that the admin page will use to be able to render content.
 * there can be multiple sources of data for the admin pages, but this is a minimum requirement for them to function
 */
export interface IAdminService {
    getAllEntries(): Promise<FileEntryDto[]>;
    deleteEntries(ids: number[]): Promise<boolean>;
    getPagedEntries(
        start: number,
        length: number,
        sortColumn?: string,
        sortDir?: string,
        search?: string,
    ): Promise<FileEntryDto[]>;
    getFileSearchRecordCount(search: string): Promise<number>;
    getFileRecordCount(): Promise<number>;
    getStatsData(): Promise<StatsDto>;
}
