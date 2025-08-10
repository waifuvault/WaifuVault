import { injectable, logger } from "@tsed/di";
import { SQLITE_DATA_SOURCE } from "../model/di/tokens.js";
import { dataSource } from "./DataSource.js";
import type { Logger as TypeOrmLogger } from "typeorm/logger/Logger.js";

export function registerDatasource(): void {
    injectable(SQLITE_DATA_SOURCE).asyncFactory(async () => {
        await dataSource.initialize();
        const $log = logger();
        dataSource.setOptions({
            logging: false,
            logger: new (class LoggerProxy implements TypeOrmLogger {
                public logQuery(query: string, parameters?: unknown[]): void {
                    $log.debug(query, parameters);
                }

                public logMigration(message: string): void {
                    $log.debug(message);
                }

                public log(level: "log" | "info" | "warn", message: unknown): void {
                    switch (level) {
                        case "log":
                        case "info":
                            $log.info(message);
                            break;
                        case "warn":
                            $log.warn(message);
                            break;
                    }
                }

                public logSchemaBuild(message: string): void {
                    $log.debug(message);
                }

                public logQueryError(error: string | Error, query: string, parameters?: unknown[]): void {
                    $log.error(error, query, parameters);
                }

                public logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
                    $log.warn(time, query, parameters);
                }
            })(),
        });
        $log.info(`Connected with typeorm to database: ${dataSource.options.database}`);
        return dataSource;
    });
}
