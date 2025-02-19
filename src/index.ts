import "reflect-metadata";
import { $log, PlatformBuilder } from "@tsed/common";
import { PlatformExpress } from "@tsed/platform-express";
import { Server } from "./Server.js";
import process from "process";
import { Application } from "express";
import { registerDatasource } from "./db/registerDatasource.js";
import { isGhAction } from "./config/envs/index.js";

async function bootstrap(): Promise<void> {
    registerDatasource();
    let platform: PlatformBuilder<Application> | null = null;
    try {
        platform = await PlatformExpress.bootstrap(Server);
        await platform.listen();

        process.on("SIGINT", () => {
            if (platform) {
                platform.stop();
            }
        });
        await stopOnTest(platform, false);
    } catch (error) {
        $log.error({ event: "SERVER_BOOTSTRAP_ERROR", message: error.message, stack: error.stack });
        await stopOnTest(platform, true);
    }
}

async function stopOnTest(platform: PlatformBuilder<Application> | null, error: boolean): Promise<void> {
    if (!isGhAction) {
        return;
    }
    if (platform) {
        await platform.stop();
    }
    if (error) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

bootstrap();
