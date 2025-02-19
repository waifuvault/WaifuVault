import { DataSource, type DataSourceOptions } from "typeorm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "process";
import dotenv from "dotenv";
import { dbType, isGhAction } from "../config/envs/index.js";

dotenv.config();

let redisUrl: URL | undefined;
if (!isGhAction) {
    redisUrl = new URL(process.env.REDIS_URI as string);
}

let dbOptions: Partial<DataSourceOptions> = {};

if (dbType === "postgres") {
    const postgresOptions = dotenv.config({
        path: ["postgres.env"],
    }).parsed;
    if (!postgresOptions) {
        throw new Error("postgres.env not found");
    }

    dbOptions = {
        type: "postgres",
        entities: [`${path.dirname(fileURLToPath(import.meta.url))}/../model/db/**/*.model.{ts,js}`],
        synchronize: false,
        migrations: [`${path.dirname(fileURLToPath(import.meta.url))}/../migrations/postgres/*`],
        database: postgresOptions.POSTGRES_DB,
        username: postgresOptions.POSTGRES_USER,
        password: postgresOptions.POSTGRES_PASSWORD,
        port: postgresOptions.POSTGRES_PORT ? Number.parseInt(postgresOptions.POSTGRES_PORT) : 5004,
        cache: isGhAction
            ? false
            : {
                  type: "ioredis",
                  options: {
                      host: redisUrl!.hostname,
                      port: Number.parseInt(redisUrl!.port),
                  },
              },
    };
} else if (dbType === "sqlite") {
    dbOptions = {
        type: "better-sqlite3",
        entities: [`${path.dirname(fileURLToPath(import.meta.url))}/../model/db/**/*.model.{ts,js}`],
        synchronize: false,
        migrations: [`${path.dirname(fileURLToPath(import.meta.url))}/../migrations/sqlite/*`],
        database: "main.sqlite",
        cache: isGhAction
            ? false
            : {
                  type: "ioredis",
                  options: {
                      host: redisUrl!.hostname,
                      port: Number.parseInt(redisUrl!.port),
                  },
              },
    };
} else {
    throw new Error("DATABASE_TYPE not found in .env");
}

export const dataSource = new DataSource(dbOptions as DataSourceOptions);
