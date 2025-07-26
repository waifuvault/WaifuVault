import { Middleware, type MiddlewareMethods } from "@tsed/platform-middlewares";
import { Req, Res } from "@tsed/common";
import { Inject } from "@tsed/di";
import { IpBlackListRepo } from "../../db/repo/IpBlackListRepo.js";
import { Forbidden } from "@tsed/exceptions";
import { NetworkUtils } from "../../utils/Utils.js";
import type { Request, Response } from "express";
import maxmind, { CountryResponse } from "maxmind";

@Middleware()
export class IpFilterMiddleware implements MiddlewareMethods {
    public constructor(@Inject() private ipRepo: IpBlackListRepo) {}

    public async use(@Req() req: Request, @Res() res: Response): Promise<void> {
        const ip = NetworkUtils.getIp(req);
        const isBlocked = await this.ipRepo.isIpBlocked(ip);
        if (isBlocked) {
            throw new Forbidden("");
        }
        const lookup = await maxmind.open<CountryResponse>("Geolite2-Country.mmdb");
        const iplookup = lookup.get(ip);
        if (iplookup?.country?.iso_code === "GB") {
            // GB IP detected redirect to explainer page
            res.redirect(`/ukonlinesafety`);
        }
    }
}
