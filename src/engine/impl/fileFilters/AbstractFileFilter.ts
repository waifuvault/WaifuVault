import { IFileFilter } from "../../IFileFilter.js";
import { PlatformMulterFile } from "@tsed/common";
import { Awaitable } from "../../../utils/typeings.js";
import { FileUtils } from "../../../utils/Utils.js";
import { Logger } from "@tsed/logger";
import { Exception } from "@tsed/exceptions";
import path from "node:path";

export abstract class AbstractFileFilter implements IFileFilter {
    protected constructor(protected logger: Logger) {}
    public async doFilter(file: string | PlatformMulterFile): Promise<boolean> {
        let didPass = false;
        try {
            didPass = await this.doFilterInternal(file);
            if (!didPass) {
                await this.deleteFileOnFilterFail(file);
            }
        } catch (e) {
            await this.deleteFileOnFilterFail(file);
            throw e;
        }
        return didPass;
    }

    protected async deleteFileOnFilterFail(file: string | PlatformMulterFile): Promise<void> {
        const resource = typeof file === "string" ? file : file.path;
        const fileExists = await FileUtils.fileExists(resource);
        if (fileExists) {
            try {
                await FileUtils.deleteFile(path.basename(resource), false);
            } catch (e) {
                this.logger.error(`Unable to delete resource ${resource}`);
                throw e;
            }
        }
    }

    protected abstract doFilterInternal(file: string | PlatformMulterFile): Awaitable<boolean>;

    public abstract get error(): Exception;
    public abstract get priority(): number;
}
