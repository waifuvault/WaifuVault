import dotenv from "dotenv";
import {Env} from "@tsed/core";

export const envs = {
    ...process.env,
    ...dotenv.config().parsed
};
export const isProduction = process.env.NODE_ENV === Env.PROD;
