import { Middleware, UseBefore, type MiddlewareMethods } from "@tsed/platform-middlewares";
import { Req, Res, type PlatformContext } from "@tsed/platform-http";
import { Inject, InjectContext } from "@tsed/di";
import { TooManyRequests } from "@tsed/exceptions";
import { StoreSet, useDecorators } from "@tsed/core";
import type { Request, Response } from "express";
import { NetworkUtils } from "../../utils/Utils.js";
import { GlobalEnv } from "../../model/constants/GlobalEnv.js";
import { SettingsService } from "../../services/SettingsService.js";
import { UserService } from "../../services/UserService.js";
import { REDIS_CONNECTION } from "../../model/di/tokens.js";
import type { RedisConnection } from "../../redis/Connection.js";

export interface RateLimitOptions {
    key: string;
    limitSetting: GlobalEnv;
    windowSetting: GlobalEnv;
}

@Middleware({ priority: -20 })
export class RateLimitMiddleware implements MiddlewareMethods {
    private static readonly keyPrefix = "rl:";

    @InjectContext()
    protected $ctx?: PlatformContext;

    public constructor(
        @Inject(REDIS_CONNECTION) private redis: RedisConnection,
        @Inject() private settingsService: SettingsService,
        @Inject() private userService: UserService,
    ) {}

    public async use(@Req() req: Request, @Res() res: Response): Promise<void> {
        const options = this.$ctx?.endpoint.get<RateLimitOptions | undefined>(RateLimitMiddleware);
        if (!options) {
            return;
        }

        if (this.userService.isLoggedIn()) {
            return;
        }

        const limit = Number.parseInt(this.settingsService.getSetting(options.limitSetting) ?? "0");
        if (!limit || Number.isNaN(limit)) {
            return;
        }

        const windowMs = Number.parseInt(this.settingsService.getSetting(options.windowSetting) ?? "60000");
        const redisKey = `${RateLimitMiddleware.keyPrefix}${options.key}:${NetworkUtils.getIp(req)}`;

        const count = await this.redis.incr(redisKey);
        let ttlMs: number;
        if (count === 1) {
            await this.redis.pexpire(redisKey, windowMs);
            ttlMs = windowMs;
        } else {
            ttlMs = await this.redis.pttl(redisKey);
            if (ttlMs < 0) {
                await this.redis.pexpire(redisKey, windowMs);
                ttlMs = windowMs;
            }
        }

        const resetSeconds = Math.ceil(ttlMs / 1000);
        const remaining = Math.max(0, limit - count);

        res.setHeader("RateLimit-Limit", limit);
        res.setHeader("RateLimit-Remaining", remaining);
        res.setHeader("RateLimit-Reset", resetSeconds);

        if (count > limit) {
            res.setHeader("Retry-After", resetSeconds);
            throw new TooManyRequests("Too many requests, please try again later");
        }
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function RateLimit(options: RateLimitOptions): MethodDecorator {
    return useDecorators(StoreSet(RateLimitMiddleware, options), UseBefore(RateLimitMiddleware));
}
