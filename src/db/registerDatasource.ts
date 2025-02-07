import { injectable } from "@tsed/di";
import { SQLITE_DATA_SOURCE } from "../model/di/tokens.js";
import { dataSource } from "./DataSource.js";
import { DataSource } from "typeorm";
import type { Logger as TypeOrmLogger } from "typeorm/logger/Logger.js";
import { $log } from "@tsed/common";

export function registerDatasource(): void {
    injectable(SQLITE_DATA_SOURCE)
        .asyncFactory(async () => {
            await dataSource.initialize();
            const loggerInstance = $log;
            dataSource.setOptions({
                logger: new (class LoggerProxy implements TypeOrmLogger {
                    public logQuery(query: string, parameters?: unknown[]): void {
                        loggerInstance.debug(query, parameters);
                    }

                    public logMigration(message: string): void {
                        loggerInstance.debug(message);
                    }

                    public log(level: "log" | "info" | "warn", message: unknown): void {
                        switch (level) {
                            case "log":
                            case "info":
                                loggerInstance.info(message);
                                break;
                            case "warn":
                                loggerInstance.warn(message);
                                break;
                        }
                    }

                    public logSchemaBuild(message: string): void {
                        loggerInstance.debug(message);
                    }

                    public logQueryError(error: string | Error, query: string, parameters?: unknown[]): void {
                        loggerInstance.error(error, query, parameters);
                    }

                    public logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
                        loggerInstance.warn(time, query, parameters);
                    }
                })(),
            });
            loggerInstance.info(`Connected with typeorm to database: ${dataSource.options.database}`);
            return dataSource;
        })
        .hooks({
            $onDestroy(dataSource: DataSource) {
                return dataSource.isInitialized && dataSource.destroy();
            },
        });
}
