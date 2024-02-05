import {Get, Hidden} from "@tsed/schema";
import {Controller} from "@tsed/di";
import {PathParams, Res} from "@tsed/common";
import path from "path";
import {filesDir} from "../../utils/Utils.js";

@Hidden()
@Controller("/")
export class FileServerController {

    @Get("/:t/:file(*)")
    public get(@PathParams("file") resource: string, @PathParams("t") epoch: string, @Res() res: Res): Promise<void> {
        const filesDirRel = path.resolve(filesDir);
        const file = `${filesDirRel}/${epoch}/${resource}`;
        return new Promise((resolve, reject) => {
            res.sendFile(file, {headers: {'filename': 'myfile'}}, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
}
