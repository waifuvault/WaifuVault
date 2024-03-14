import { Get, Hidden, View } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Req, Res } from "@tsed/common";
import { FileService } from "../../services/FileService.js";
import { ObjectUtils } from "../../utils/Utils.js";

@Controller("/")
@Hidden()
export class HomeView {
    public constructor(@Inject() private fileService: FileService) {}

    @Get()
    @View("index.ejs")
    public async showRoot(): Promise<unknown> {
        const records = await this.fileService.getRecordCount();
        const size = await this.fileService.getRecordSize();
        return {
            recordCount: records.toLocaleString(),
            recordSize: ObjectUtils.sizeToHuman(size),
        };
    }

    @Get("/login")
    @View("login.ejs")
    public showLogin(@Req() req: Req, @Res() res: Res): unknown {
        if (req.user) {
            res.redirect("/admin/stats");
        }
        return null;
    }
}
