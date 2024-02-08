import {Get, Hidden} from "@tsed/schema";
import {Controller, Inject} from "@tsed/di";
import {HeaderParams, PathParams, Res} from "@tsed/common";
import path, * as Path from "path";
import {filesDir} from "../../utils/Utils.js";
import {FileService} from "../../services/FileService.js";
import {FileEngine} from "../../engine/FileEngine.js";
import {NotFound} from "@tsed/exceptions";
import {sanitize} from "sanitize-filename-ts";
import {FileProtectedException} from "../../model/exceptions/FileProtectedException.js";

@Hidden()
@Controller("/")
export class FileServerController {

    public constructor(
        @Inject() private fileService: FileService,
        @Inject() private fileEngine: FileEngine
    ) {
    }

    private readonly filesDirRel = path.resolve(filesDir);

    @Get("/:t/:file(*)")
    public async getFile(
        @Res() res: Res,
        @PathParams("file") requestedFileName: string,
        @PathParams("t") resource: string,
        @HeaderParams("x-password") password?: string
    ): Promise<void> {
        await this.hasPassword(res, resource, password);
        const entry = await this.fileService.getEntry(resource, requestedFileName, password);
        const file = `${this.filesDirRel}/${entry.fullFileNameOnSystem}`;
        return new Promise((resolve, reject) => {
            res.sendFile(file, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }


    @Get("/:file(*)")
    public async getFileHiddenFilename(
        @PathParams("file") resource: string,
        @Res() res: Res,
        @HeaderParams("x-password") password?: string
    ): Promise<void> {
        if (!resource) {
            throw new NotFound(`Resource is not found`);
        }
        const sanitized = sanitize(resource);
        const filesDirRel = path.resolve(filesDir);
        const file = `${filesDirRel}/${sanitized}`;
        const exists = await this.fileEngine.fileExists(file);
        if (!exists) {
            throw new NotFound(`Resource ${resource} is not found`);
        }
        const resourceWithoutExt = Path.parse(resource).name;
        await this.hasPassword(res, resourceWithoutExt, password);
        await this.fileService.validatePassword(resourceWithoutExt, password);
        return new Promise((resolve, reject) => {
            res.sendFile(file, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    private async hasPassword(@Res() res: Res, resource: string, password?: string): Promise<void> {
        const resourceIsProtected = await this.fileService.requiresPassword(resource);
        if (resourceIsProtected && !password) {
            throw new FileProtectedException("This file requires `x-password` to be set and correct", resource);
        }
    }
}
