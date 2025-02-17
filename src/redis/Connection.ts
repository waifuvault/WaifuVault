import Redis from "ioredis";
import { registerConnectionProvider } from "@tsed/ioredis";
import { REDIS_CONNECTION } from "../model/di/tokens.js";

export type RedisConnection = Redis;
export function initRedisProvider(): void {
    registerConnectionProvider({
        token: REDIS_CONNECTION,
        name: "default",
    });
}
