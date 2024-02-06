import {Get, Hidden} from "@tsed/schema";
import {Controller, Inject} from "@tsed/di";
import {PathParams, Res} from "@tsed/common";
import path from "path";
import {filesDir} from "../../utils/Utils.js";
import {FileService} from "../../services/FileService.js";
import {FileEngine} from "../../engine/FileEngine.js";
import {NotFound} from "@tsed/exceptions";

@Hidden()
@Controller("/")
export class FileServerController {

    @Inject()
    private fileService: FileService;

    @Inject()
    private fileEngine: FileEngine;

    private readonly filesDirRel = path.resolve(filesDir);

    @Get("/:t/:file(*)")
    public async getFile(@PathParams("file") requestedFileName: string, @PathParams("t") resource: string, @Res() res: Res): Promise<void> {
        const entry = await this.fileService.getEntryFromFileName(resource, requestedFileName);
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
    public async getFileLegacy(@PathParams("file") resource: string, @Res() res: Res): Promise<void> {
        const filesDirRel = path.resolve(filesDir);
        const file = `${filesDirRel}/${resource}`;
        const exists = await this.fileEngine.fileExists(file);
        if (!exists) {
            throw new NotFound(`Resource ${resource} is not found`);
        }
        return new Promise((resolve, reject) => {
            res.sendFile(file, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
}
