import Redis from "ioredis";
import { registerConnectionProvider } from "@tsed/ioredis";
import { REDIS_CONNECTION } from "../model/di/tokens.js";
import { isGhAction } from "../config/envs/index.js";

export type RedisConnection = Redis;
export function initRedisProvider(): void {
    if (isGhAction) {
        return;
    }
    registerConnectionProvider({
        token: REDIS_CONNECTION,
        name: "default",
    });
}
