import { Middleware, type MiddlewareMethods } from "@tsed/platform-middlewares";
import { Req } from "@tsed/platform-http";
import { Inject } from "@tsed/di";
import { IpBlackListRepo } from "../../db/repo/IpBlackListRepo.js";
import { Forbidden } from "@tsed/exceptions";
import { NetworkUtils } from "../../utils/Utils.js";
import type { Request } from "express";

@Middleware()
export class IpFilterMiddleware implements MiddlewareMethods {
    public constructor(@Inject() private ipRepo: IpBlackListRepo) {}

    public async use(@Req() req: Request): Promise<void> {
        const ip = NetworkUtils.getIp(req);
        const isBlocked = await this.ipRepo.isIpBlocked(ip);
        if (isBlocked) {
            throw new Forbidden("");
        }
    }
}
