import { Inject, Injectable, ProviderScope } from "@tsed/di";
import { FILE_FILTER } from "../../../model/di/tokens.js";
import { PlatformMulterFile } from "@tsed/common";
import { AbstractFileFilter } from "./AbstractFileFilter.js";
import { Logger } from "@tsed/logger";
import { MimeService } from "../../../services/MimeService.js";
import { Exception, UnsupportedMediaType } from "@tsed/exceptions";
import { FileFilterPriority } from "../../IFileFilter.js";

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: FILE_FILTER,
})
export class MimeFilter extends AbstractFileFilter {
    public constructor(
        @Inject() private mimeService: MimeService,
        @Inject() logger: Logger,
    ) {
        super(logger);
    }

    protected override async doFilterInternal(file: string | PlatformMulterFile): Promise<boolean> {
        const resource = typeof file === "string" ? file : file.path;
        return !(await this.mimeService.isBlocked(resource));
    }

    public get error(): Exception {
        return new UnsupportedMediaType(`MIME type not supported`);
    }

    public override get priority(): number {
        return FileFilterPriority.LOWEST;
    }
}
