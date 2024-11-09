import { Awaitable } from "../utils/typeings.js";
import type { PlatformMulterFile } from "@tsed/common";
import { Exception } from "@tsed/exceptions";

export enum FileFilterPriority {
    HIGHEST = Number.MAX_SAFE_INTEGER,
    LOWEST = Number.MIN_SAFE_INTEGER,
}

export interface IFileFilter {
    doFilter(file: string | PlatformMulterFile): Awaitable<boolean>;
    get error(): Exception;
    get priority(): number;
}
