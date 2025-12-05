import { AbstractFileFilter } from "./AbstractFileFilter.js";
import { Inject, Injectable, InjectContext, ProviderScope } from "@tsed/di";
import { FILE_FILTER } from "../../../model/di/tokens.js";
import { Logger } from "@tsed/logger";
import { Exception, UnprocessableEntity } from "@tsed/exceptions";
import { PlatformMulterFile } from "@tsed/platform-multer";
import { FileFilterPriority } from "../../IFileFilter.js";
import { SettingsService } from "../../../services/SettingsService.js";
import { GlobalEnv } from "../../../model/constants/GlobalEnv.js";
import type { PlatformContext } from "@tsed/platform-http";
import { NetworkUtils } from "../../../utils/Utils.js";
import { UserAdminService } from "../../../services/UserAdminService.js";
import { TimedSet } from "../../../utils/timedSet/TimedSet.js";

class FailedUploadTracker {
    public count = 1;
    public constructor(public readonly ip: string) {}
}

@Injectable({
    scope: ProviderScope.SINGLETON,
    type: FILE_FILTER,
})
export class FileRejectionFilter extends AbstractFileFilter {
    private readonly filePattern: RegExp | null = null;
    private readonly autoBlockEnabled: boolean = false;
    private readonly failedAttempts: TimedSet<FailedUploadTracker> = new TimedSet(10000); // 10 seconds
    private readonly abuseThreshold = 10;

    @InjectContext()
    protected $ctx?: PlatformContext;

    public constructor(
        @Inject() logger: Logger,
        @Inject() settingsService: SettingsService,
        @Inject() private userAdminService: UserAdminService,
    ) {
        super(logger);
        const pattern = settingsService.getSetting(GlobalEnv.FILE_FILTER_PATTERN) ?? null;
        if (pattern) {
            this.filePattern = new RegExp(pattern);
        }
        this.autoBlockEnabled = settingsService.getSetting(GlobalEnv.FILE_FILTER_AUTO_BLOCK) === "true";
    }

    protected override async doFilterInternal(file: string | PlatformMulterFile): Promise<boolean> {
        if (!this.filePattern) {
            return true;
        }

        const fileName = typeof file === "string" ? file : file.originalname;
        if (this.filePattern.test(fileName)) {
            if (this.autoBlockEnabled) {
                await this.trackFailedUpload();
            }
            return false;
        }

        return true;
    }

    private async trackFailedUpload(): Promise<void> {
        const ip = this.getIp();
        if (!ip) {
            return;
        }

        const tracker = this.findTracker(ip);
        if (tracker) {
            tracker.count++;
            if (tracker.count > this.abuseThreshold) {
                this.failedAttempts.delete(tracker);
                await this.userAdminService.blockIp(ip, true);
                this.logger.warn(`Banned IP ${ip} for exceeding file rejection threshold`);
            } else {
                this.failedAttempts.refresh(tracker);
            }
        } else {
            this.failedAttempts.add(new FailedUploadTracker(ip));
        }
    }

    public override get error(): Exception {
        return new UnprocessableEntity("File Not Accepted");
    }

    public override get priority(): number {
        return FileFilterPriority.HIGHEST;
    }

    private getIp(): string | null {
        if (!this.$ctx) {
            return null;
        }
        return NetworkUtils.getIp(this.$ctx.request.request);
    }

    private findTracker(ip: string): FailedUploadTracker | undefined {
        for (const tracker of this.failedAttempts) {
            if (tracker.ip === ip) {
                return tracker;
            }
        }
        return undefined;
    }
}
