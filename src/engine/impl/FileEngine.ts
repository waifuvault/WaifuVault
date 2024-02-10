import {Injectable, ProviderScope} from "@tsed/di";
import fs from 'node:fs/promises';
import type {PlatformMulterFile} from "@tsed/common";
import {filesDir} from "../../utils/Utils.js";

@Injectable({
    scope: ProviderScope.SINGLETON
})
export class FileEngine {

    public deleteFile(file: string | PlatformMulterFile, force = true): Promise<void> {
        const toDelete = this.getFilePath(file);
        return fs.rm(toDelete, {recursive: true, force});
    }

    public async getFileSize(file: string | PlatformMulterFile): Promise<number> {
        const f = this.getFilePath(file);
        const stat = await fs.stat(f);
        return stat.size;
    }


    private getFilePath(file: string | PlatformMulterFile): string {
        return typeof file === "string" ? `${filesDir}/${file}` : file.path;
    }

    public async fileExists(file: string): Promise<boolean> {
        try {
            await fs.access(file, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

}
