import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { IpBlackListRepo } from "../db/repo/IpBlackListRepo.js";
import { IAdminService } from "./IAdminService.js";
import { FileRepo } from "../db/repo/FileRepo.js";
import { FileService } from "./FileService.js";
import type { FileSearchTerm, FileSortColumn, SortDirection } from "../utils/typeings.js";

export abstract class AbstractAdminService implements IAdminService {
    protected constructor(
        protected ipBlackListRepo: IpBlackListRepo,
        protected repo: FileRepo,
        protected fileService: FileService,
        protected baseUrl: string,
    ) {}

    public getStatsData(): Promise<FileUploadModel[]> {
        return this.getAllEntries();
    }

    public abstract getAllEntries(): Promise<FileUploadModel[]>;

    protected abstract getBucketScope(): string | undefined;

    public getMatchingEntries(
        start: number,
        length: number,
        sortColumn: FileSortColumn = "id",
        sortDirection: SortDirection = "ASC",
        search = "",
    ): Promise<FileUploadModel[]> {
        return this.repo.getEntriesMatching(
            this.parseSearch(search),
            start,
            length,
            sortColumn,
            sortDirection,
            this.getBucketScope(),
        );
    }

    public getMatchingRecordCount(search = ""): Promise<number> {
        return this.repo.getMatchingRecordCount(this.parseSearch(search), this.getBucketScope());
    }

    public async deleteEntries(ids: number[]): Promise<boolean> {
        if (ids.length === 0) {
            return false;
        }
        const matchingEntries = await this.repo.getAllEntries(ids);
        if (matchingEntries.length === 0) {
            return false;
        }
        const tokensToDelete = matchingEntries.map(entry => entry.token);
        await this.fileService.processDelete(tokensToDelete);
        return true;
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
                    columns: ["fileName", "fileExtension", "ip", "originalFileName", "albumName"],
                    value: body,
                    exclude,
                    exact: false,
                };
            })
            .filter(term => term.value !== "");
    }
}
