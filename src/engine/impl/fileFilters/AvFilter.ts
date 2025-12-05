import { Inject, Injectable, ProviderScope } from "@tsed/di";
import { FILE_FILTER } from "../../../model/di/tokens.js";
import { type PlatformMulterFile } from "@tsed/platform-multer";
import { AvManager } from "../../../manager/AvManager.js";
import { AbstractFileFilter } from "./AbstractFileFilter.js";
import { Logger } from "@tsed/logger";
import { BadRequest, Exception } from "@tsed/exceptions";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: FILE_FILTER,
})
export class AvFilter extends AbstractFileFilter {
    public constructor(
        @Inject() private avManager: AvManager,
        @Inject() logger: Logger,
    ) {
        super(logger);
    }

    protected override doFilterInternal(file: string | PlatformMulterFile): Promise<boolean> {
        return this.avManager.scanFile(file);
    }

    public override get error(): Exception {
        return new BadRequest("Failed to store file");
    }

    public override get priority(): number {
        return 2;
    }
}
