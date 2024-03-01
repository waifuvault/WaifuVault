import { Get, Hidden, View } from "@tsed/schema";
import { Controller } from "@tsed/di";
import { Authorize } from "@tsed/passport";
import type { CustomUserInfoModel } from "../../model/auth/CustomUserInfoModel.js";
import { Req } from "@tsed/common";

@Controller("/")
@Hidden()
export class AdminView {
    @Get()
    @Authorize("loginAuthProvider")
    @View("/secure/admin.ejs")
    public showAdmin(@Req() req: Req): unknown {
        return {
            user: req.user as CustomUserInfoModel,
        };
    }
}
