import { DataSource, type DataSourceOptions } from "typeorm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "process";
import dotenv from "dotenv";

dotenv.config();

const argv = process.argv.slice(2);

let redisUrl: URL | undefined;
if (!argv.includes("-closeOnStart")) {
    redisUrl = new URL(process.env.REDIS_URI as string);
}

const options: DataSourceOptions = {
    type: "better-sqlite3",
    entities: [`${path.dirname(fileURLToPath(import.meta.url))}/../model/db/**/*.model.{ts,js}`],
    synchronize: false,
    migrations: [`${path.dirname(fileURLToPath(import.meta.url))}/../migrations/*`],
    database: "main.sqlite",
    cache: argv.includes("-closeOnStart")
        ? false
        : {
              type: "ioredis",
              options: {
                  host: redisUrl!.hostname,
                  port: Number.parseInt(redisUrl!.port),
              },
          },
};

export const dataSource = new DataSource(options as DataSourceOptions);
