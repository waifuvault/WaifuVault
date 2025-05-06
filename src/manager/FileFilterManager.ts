import { Inject, Injectable } from "@tsed/di";
import { type PlatformMulterFile } from "@tsed/platform-multer";
import { FILE_FILTER } from "../model/di/tokens.js";
import { IFileFilter } from "../engine/IFileFilter.js";

@Injectable()
export class FileFilterManager {
    public constructor(@Inject(FILE_FILTER) private readonly fileFilters: IFileFilter[]) {}

    public async process(file: string | PlatformMulterFile): Promise<IFileFilter[]> {
        const results = await Promise.all(
            this.fileFilters
                .sort((a, b) => b.priority - a.priority)
                .map(async filter => ({
                    filter,
                    passed: await filter.doFilter(file),
                })),
        );
        return results.filter(result => !result.passed).map(result => result.filter);
    }
}
