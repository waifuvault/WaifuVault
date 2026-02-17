import { Middleware, type MiddlewareMethods } from "@tsed/platform-middlewares";
import { Req } from "@tsed/platform-http";
import { Constant, Inject } from "@tsed/di";
import { IpBlackListRepo } from "../../db/repo/IpBlackListRepo.js";
import { Forbidden } from "@tsed/exceptions";
import { NetworkUtils } from "../../utils/Utils.js";
import type { Request } from "express";
import dns from "node:dns/promises";
import { GlobalEnv } from "../../model/constants/GlobalEnv.js";
import { REDIS_CONNECTION } from "../../model/di/tokens.js";
import type { RedisConnection } from "../../redis/Connection.js";

@Middleware()
export class IpFilterMiddleware implements MiddlewareMethods {
    private static readonly droneblPrefix = "dronebl:";
    private static readonly droneblTTL = 86400;

    @Constant(GlobalEnv.DRONEBL_ENABLED, "false")
    private readonly droneblEnabled: string;

    public constructor(
        @Inject() private ipRepo: IpBlackListRepo,
        @Inject(REDIS_CONNECTION) private redis: RedisConnection,
    ) {}

    public async use(@Req() req: Request): Promise<void> {
        const ip = NetworkUtils.getIp(req);
        const isBlocked = await this.ipRepo.isIpBlocked(ip);
        if (isBlocked) {
            throw new Forbidden("");
        }
        if (this.droneblEnabled === "true") {
            const rawIp = NetworkUtils.getRawIp(req);
            const cacheKey = `${IpFilterMiddleware.droneblPrefix}${rawIp}`;
            const cached = await this.redis.get(cacheKey);
            if (cached === null) {
                const listed = await this.isDroneBLListed(rawIp);
                await this.redis.setex(cacheKey, IpFilterMiddleware.droneblTTL, String(listed));
                if (listed) {
                    throw new Forbidden("");
                }
            } else if (cached === "true") {
                throw new Forbidden("");
            }
        }
    }

    private async isDroneBLListed(ip: string): Promise<boolean> {
        if (ip.includes(":")) {
            return false;
        }
        const reversed = ip.split(".").reverse().join(".");
        try {
            await dns.resolve4(`${reversed}.dnsbl.dronebl.org`);
            return true;
        } catch {
            return false;
        }
    }
}
