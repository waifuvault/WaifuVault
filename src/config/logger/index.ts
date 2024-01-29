import {$log, DILoggerOptions} from "@tsed/common";
import {isProduction} from "../envs";

if (isProduction) {
    $log.appenders.set("stdout", {
        type: "stdout",
        levels: ["info", "debug"],
        layout: {
            type: "json"
        }
    });

    $log.appenders.set("stderr", {
        levels: ["trace", "fatal", "error", "warn"],
        type: "stderr",
        layout: {
            type: "json"
        }
    });
}

export default <DILoggerOptions>{
    disableRoutesSummary: isProduction,
    logRequest: !isProduction,
    ignoreUrlPatterns: ["\\/apple-touch-icon"]
};
