import {Middleware, type MiddlewareMethods} from "@tsed/platform-middlewares";
import {Req} from "@tsed/common";
import {Inject} from "@tsed/di";
import {IpBlackListRepo} from "../../db/repo/IpBlackListRepo.js";
import {Forbidden} from "@tsed/exceptions";

@Middleware()
export class IpFilterMiddleware implements MiddlewareMethods {

    @Inject()
    private ipRepo: IpBlackListRepo;

    public async use(@Req() req: Req): Promise<void> {
        const ip = req.ip.replace(/:\d+[^:]*$/, '');
        const isBlocked = await this.ipRepo.isIpBlocked(ip);
        if (isBlocked) {
            throw new Forbidden("Your IP has been blocked");
        }
    }

}
