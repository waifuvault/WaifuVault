import { DataSource } from "typeorm";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const dataSource = new DataSource({
    type: "better-sqlite3",
    entities: [`${path.dirname(fileURLToPath(import.meta.url))}/../model/db/**/*.model.{ts,js}`],
    synchronize: false,
    migrations: [`${path.dirname(fileURLToPath(import.meta.url))}/../migrations/*`],
    database: "main.sqlite",
});
