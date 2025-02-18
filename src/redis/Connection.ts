import Redis from "ioredis";
import { registerConnectionProvider } from "@tsed/ioredis";
import { REDIS_CONNECTION } from "../model/di/tokens.js";
import process from "process";

export type RedisConnection = Redis;
export function initRedisProvider(): void {
    const argv = process.argv.slice(2);
    if (argv.includes("-closeOnStart")) {
        return;
    }
    registerConnectionProvider({
        token: REDIS_CONNECTION,
        name: "default",
    });
}
