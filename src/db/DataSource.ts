import { DataSource } from "typeorm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "process";
import dotenv from "dotenv";

dotenv.config();

const url = new URL(process.env.REDIS_URI as string);
export const dataSource = new DataSource({
    type: "better-sqlite3",
    entities: [`${path.dirname(fileURLToPath(import.meta.url))}/../model/db/**/*.model.{ts,js}`],
    synchronize: false,
    migrations: [`${path.dirname(fileURLToPath(import.meta.url))}/../migrations/*`],
    database: "main.sqlite",
    cache: {
        type: "ioredis",
        options: {
            host: url.hostname,
            port: Number.parseInt(url.port),
        },
    },
});
