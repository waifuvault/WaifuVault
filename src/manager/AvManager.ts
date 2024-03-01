import { Inject, Injectable } from "@tsed/di";
import { AvFactory } from "../factory/AvFactory.js";
import type { PlatformMulterFile } from "@tsed/common";
import { Logger } from "@tsed/logger";
import { FileEngine } from "../engine/impl/index.js";
import { BadRequest } from "@tsed/exceptions";
import path from "node:path";

@Injectable()
export class AvManager {
    public constructor(
        @Inject() private readonly avFactory: AvFactory,
        @Inject() private logger: Logger,
        @Inject() private fileEngine: FileEngine,
    ) {}

    public async scanFile(file: string | PlatformMulterFile): Promise<void> {
        const avEngineToUse = this.avFactory.getFirstAvailableAvEngine();
        if (!avEngineToUse) {
            this.logger.warn("No AV is enabled!");
            return;
        }
        const resource = typeof file === "string" ? path.basename(file) : file.filename;
        const scanResult = await avEngineToUse.scan(resource);
        if (!scanResult.passed) {
            const fileExists = await this.fileEngine.fileExists(resource);
            if (fileExists) {
                try {
                    await this.fileEngine.deleteFile(file, false);
                } catch (e) {
                    // this basically means we could not delete the virus...
                    this.logger.error(`Unable to delete resource ${resource} after positive AV detection`);
                    throw new BadRequest(e.message);
                }
            }
            let errStr = "";
            if (scanResult.additionalMessage) {
                errStr += `AV scan of resource ${resource} failed.`;
            }
            if (scanResult.errorCode) {
                errStr += ` scan filed with error code ${scanResult.errorCode}`;
            }
            if (errStr === "") {
                // the scan failed but nothing was reported
                errStr = "AV Scan failed with no reported reason";
            }
            this.logger.warn(errStr);
            throw new BadRequest("Failed to store file");
        }
    }
}
