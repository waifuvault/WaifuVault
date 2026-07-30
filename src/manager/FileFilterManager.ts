import { Inject, Injectable } from "@tsed/di";
import { type PlatformMulterFile } from "@tsed/platform-multer";
import { FILE_FILTER } from "../model/di/tokens.js";
import { IFileFilter } from "../engine/IFileFilter.js";

@Injectable()
export class FileFilterManager {
    public constructor(@Inject(FILE_FILTER) private readonly fileFilters: IFileFilter[]) {}

    public async process(file: string | PlatformMulterFile, originalFileName: string): Promise<IFileFilter[]> {
        const sortedFilters = [...this.fileFilters].sort((a, b) => b.priority - a.priority);

        for (const filter of sortedFilters) {
            const passed = await filter.doFilter(file, originalFileName);
            if (!passed) {
                return [filter];
            }
        }

        return [];
    }
}
