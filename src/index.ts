import "reflect-metadata";
import { $log } from "@tsed/common";
import { PlatformExpress } from "@tsed/platform-express";
import { Server } from "./Server.js";
import { DataSource, type Logger as TypeOrmLogger } from "typeorm";
import { SQLITE_DATA_SOURCE } from "./model/di/tokens.js";
import { dataSource } from "./db/DataSource.js";
import { injectable, logger } from "@tsed/di";

async function bootstrap(): Promise<void> {
    injectable(SQLITE_DATA_SOURCE)
        .asyncFactory(async () => {
            await dataSource.initialize();
            const loggerInstance = logger();
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

    try {
        const platform = await PlatformExpress.bootstrap(Server);
        await platform.listen();

        process.on("SIGINT", () => {
            platform.stop();
        });
    } catch (error) {
        $log.error({ event: "SERVER_BOOTSTRAP_ERROR", message: error.message, stack: error.stack });
    }
}

bootstrap();
