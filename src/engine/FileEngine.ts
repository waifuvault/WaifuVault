import {Constant, Inject, Injectable, ProviderScope} from "@tsed/di";
import fs from "fs";
import {PlatformMulterFile} from "@tsed/common";
import GlobalEnv from "../model/constants/GlobalEnv";
import {exec} from "child_process";
import {promisify} from "util";
import {Logger} from "@tsed/logger";
import path from "path";

@Injectable({
    scope: ProviderScope.SINGLETON
})
export class FileEngine {
    private readonly basePath = `${__dirname}\\..\\..\\files`;

    @Constant(GlobalEnv.CLAM_PATH)
    private readonly clamPath: string;

    @Inject()
    private logger: Logger;

    public deleteFile(file: string | PlatformMulterFile): Promise<void> {
        const toDelete = this.getFilePath(file);
        return fs.promises.rm(toDelete, {recursive: true, force: true});
    }

    public async scanFileWithClam(file: string | PlatformMulterFile): Promise<boolean> {
        if (!this.clamPath) {
            return true;
        }
        const toScan = path.resolve(this.getFilePath(file));
        const execPromise = promisify(exec);
        try {
            await execPromise(`"${this.clamPath}\\clamdscan" ${toScan}`);
        } catch (e) {
            if (e.code === 1) {
                return false;
            }
            this.logger.error(e.message);
            throw e;
        }
        return true;
    }

    private getFilePath(file: string | PlatformMulterFile): string {
        return typeof file === "string" ? `${this.basePath}\\${file}` : file.path;
    }

}
