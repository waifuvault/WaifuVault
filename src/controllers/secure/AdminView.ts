import {Get, Hidden, View} from "@tsed/schema";
import {Controller} from "@tsed/di";
import {Authorize} from "@tsed/passport";
import type {CustomUserInfoModel} from "../../model/auth/CustomUserInfoModel.js";
import {Req, Res} from "@tsed/common";

@Controller("/")
@Hidden()
export class AdminView {

    @Get()
    @Authorize("loginAuthProvider")
    public showAdmin(@Req() req: Req, @Res() res: Res): unknown {
        res.redirect('/admin/files');
        return {
            user: req.user as CustomUserInfoModel
        };
    }

    @Get('/files')
    @Authorize("loginAuthProvider")
    @View("/secure/files.ejs")
    public showFileAdmin(@Req() req: Req): unknown {
        return {
            user: req.user as CustomUserInfoModel
        };
    }

    @Get('/stats')
    @Authorize("loginAuthProvider")
    @View("/secure/stats.ejs")
    public showStatistics(@Req() req: Req): unknown {
        return {
            user: req.user as CustomUserInfoModel
        };
    }
}
