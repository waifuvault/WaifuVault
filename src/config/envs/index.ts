import dotenv from "dotenv";
import { Env } from "@tsed/core";
import process from "process";

export const envs = {
    ...process.env,
    ...dotenv.config().parsed,
};

const argv = process.argv.slice(2);

export const isProduction = process.env.NODE_ENV === Env.PROD;
export const isGhAction = argv.includes("-ghAction");
