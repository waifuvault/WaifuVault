import {Get, Hidden} from "@tsed/schema";
import {Controller, Inject} from "@tsed/di";
import {HeaderParams, PathParams, Res} from "@tsed/common";
import path, * as Path from "path";
import {filesDir} from "../../utils/Utils.js";
import {FileService} from "../../services/FileService.js";
import {FileProtectedException} from "../../model/exceptions/FileProtectedException.js";

@Hidden()
@Controller("/")
export class FileServerController {

    public constructor(
        @Inject() private fileService: FileService
    ) {
    }

    private readonly filesDirRel = path.resolve(filesDir);

    @Get("/:t/:file?")
    public async getFile(
        @Res() res: Res,
        @PathParams("t") resource: string,
        @HeaderParams("x-password") password?: string,
        @PathParams("file") requestedFileName?: string
    ): Promise<void> {
        await this.hasPassword(resource, password);
        const entry = await this.fileService.getEntry(resource, requestedFileName, password);
        const file = `${this.filesDirRel}/${entry.fullFileNameOnSystem}`;
        await this.sendFile(file, res);
    }

    private sendFile(file: string, res: Res): Promise<void> {
        return new Promise((resolve, reject) => {
            res.sendFile(file, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    private async hasPassword(resource: string, password?: string): Promise<boolean> {
        resource = Path.parse(resource).name;
        const resourceIsProtected = await this.isFilePasswordProtected(resource);
        if (resourceIsProtected && !password) {
            throw new FileProtectedException("This file requires `x-password` to be set and correct", resource);
        }
        return resourceIsProtected;
    }

    private isFilePasswordProtected(resource: string): Promise<boolean> {
        return this.fileService.requiresPassword(resource);
    }
}
