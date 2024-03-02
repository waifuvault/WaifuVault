import { readFileSync } from "fs";
import { envs } from "./envs/index.js";
import loggerConfig from "./logger/index.js";

const pkg = JSON.parse(readFileSync("./package.json", { encoding: "utf8" }));

export const config: Partial<TsED.Configuration> = {
    version: pkg.version,
    envs,
    logger: loggerConfig,
};
