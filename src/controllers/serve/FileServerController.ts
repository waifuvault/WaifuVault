import {Get, Hidden} from "@tsed/schema";
import {Controller, Inject} from "@tsed/di";
import {PathParams, Res} from "@tsed/common";
import path from "path";
import {filesDir} from "../../utils/Utils.js";
import {FileService} from "../../services/FileService.js";

@Hidden()
@Controller("/")
export class FileServerController {

    @Inject()
    private fileService: FileService;

    @Get("/:t/:file(*)")
    public async getFile(@PathParams("file") requestedFileName: string, @PathParams("t") resource: string, @Res() res: Res): Promise<void> {
        const filesDirRel = path.resolve(filesDir);
        const entry = await this.fileService.getEntryFromFileName(resource, requestedFileName);
        const file = `${filesDirRel}/${entry.fullFileNameOnSystem}`;
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
    public getFileLegacy(@PathParams("file") resource: string, @Res() res: Res): Promise<void> {
        const filesDirRel = path.resolve(filesDir);
        const file = `${filesDirRel}/${resource}`;
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
