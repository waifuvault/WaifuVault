import {DataSource} from "typeorm";
import path from "path";
import {fileURLToPath} from "node:url";
import {isTest} from "../config/envs/index.js";

export const dataSource = new DataSource({
    type: "better-sqlite3",
    entities: [`${path.dirname(fileURLToPath(import.meta.url))}/../model/db/**/*.model.{ts,js}`],
    synchronize: isTest,
    migrations: [`${path.dirname(fileURLToPath(import.meta.url))}/../migrations/*`],
    database: isTest ? ":memory:" : "main.sqlite"
});