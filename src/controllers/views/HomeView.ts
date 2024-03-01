import { Get, Hidden, View } from "@tsed/schema";
import { Controller } from "@tsed/di";
import { Req, Res } from "@tsed/common";

@Controller("/")
@Hidden()
export class HomeView {
    @Get()
    @View("index.ejs")
    public showRoot(): unknown {
        return null;
    }

    @Get("/login")
    @View("login.ejs")
    public showLogin(@Req() req: Req, @Res() res: Res): unknown {
        if (req.user) {
            res.redirect("/admin");
        }
        return null;
    }
}
