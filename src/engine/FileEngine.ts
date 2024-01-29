import {Injectable, ProviderScope} from "@tsed/di";
import fs from "fs";
import {PlatformMulterFile} from "@tsed/common";

@Injectable({
    scope: ProviderScope.SINGLETON
})
export class FileEngine {
    private readonly basePath = `${__dirname}/../../files`;

    public deleteFile(file: string | PlatformMulterFile): Promise<void> {
        const toDelete = typeof file === "string" ? `${this.basePath}/${file}` : file.path;
        return fs.promises.rm(toDelete, {recursive: true, force: true});
    }

}
