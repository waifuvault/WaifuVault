import { IFileFilter } from "../../IFileFilter.js";
import { type PlatformMulterFile } from "@tsed/platform-multer";
import { Awaitable } from "../../../utils/typeings.js";
import { Logger } from "@tsed/logger";
import { Exception } from "@tsed/exceptions";

export abstract class AbstractFileFilter implements IFileFilter {
    protected constructor(protected logger: Logger) {}

    public abstract doFilter(file: string | PlatformMulterFile, originalFileName: string): Awaitable<boolean>;

    public abstract get error(): Exception;
    public abstract get priority(): number;
}
