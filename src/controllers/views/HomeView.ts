import {Get, Hidden, View} from "@tsed/schema";
import {Controller} from "@tsed/di";

@Controller("/")
@Hidden()
export class HomeView {
    @Get()
    @View("index.ejs")
    public showRoot(): unknown {
        return null;
    }
}
