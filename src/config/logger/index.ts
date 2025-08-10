import { $log, type DILoggerOptions } from "@tsed/common";
import { isProduction } from "../envs/index.js";
import process from "process";

if (isProduction) {
    $log.appenders.set("stdout", {
        type: "stdout",
        levels: ["info", "debug"],
        layout: {
            type: "json",
        },
    });

    $log.appenders.set("stderr", {
        levels: ["trace", "fatal", "error", "warn"],
        type: "stderr",
        layout: {
            type: "json",
        },
    });
}

$log.level = getLogLevelsByEnv();

export default <DILoggerOptions>{
    disableRoutesSummary: isProduction,
    logRequest: !isProduction,
    ignoreUrlPatterns: ["\\/apple-touch-icon"],
    level: getLogLevelsByEnv(),
};

function getLogLevelsByEnv(): string {
    return process.env.LOG_LEVEL!;
}
