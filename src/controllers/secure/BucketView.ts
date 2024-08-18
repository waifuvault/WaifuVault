import { Controller } from "@tsed/di";
import { Get, Hidden, View } from "@tsed/schema";
import { Authorize } from "@tsed/passport";

@Controller("/bucket")
@Hidden()
export class BucketView {
    @Get()
    @View("/secure/bucket/index.ejs")
    @Authorize("bucketAuthProvider")
    public showBucketPage(): unknown {
        return null;
    }
}
