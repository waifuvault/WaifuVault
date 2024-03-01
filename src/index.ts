import "reflect-metadata";
import { $log, Logger as TsEdLogger, registerProvider } from "@tsed/common";
import { PlatformExpress } from "@tsed/platform-express";
import { Server } from "./Server.js";
import { DataSource, type Logger as TypeOrmLogger } from "typeorm";
import { SQLITE_DATA_SOURCE } from "./model/di/tokens.js";
import { dataSource } from "./db/DataSource.js";

async function bootstrap(): Promise<void> {
    registerProvider<DataSource>({
        provide: SQLITE_DATA_SOURCE,
        type: "typeorm:datasource",
        deps: [TsEdLogger],
        async useAsyncFactory(logger: TsEdLogger) {
            await dataSource.initialize();
            dataSource.setOptions({
                logger: new (class LoggerProxy implements TypeOrmLogger {
                    public logQuery(query: string, parameters?: unknown[]): void {
                        logger.debug(query, parameters);
                    }

                    public logMigration(message: string): void {
                        logger.debug(message);
                    }

                    public log(level: "log" | "info" | "warn", message: unknown): void {
                        switch (level) {
                            case "log":
                            case "info":
                                logger.info(message);
                                break;
                            case "warn":
                                logger.warn(message);
                                break;
                        }
                    }

                    public logSchemaBuild(message: string): void {
                        logger.debug(message);
                    }

                    public logQueryError(error: string | Error, query: string, parameters?: unknown[]): void {
                        logger.error(error, query, parameters);
                    }

                    public logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
                        logger.warn(time, query, parameters);
                    }
                })(),
            });
            logger.info(`Connected with typeorm to database: ${dataSource.options.database}`);
            return dataSource;
        },
        hooks: {
            $onDestroy(dataSource) {
                return dataSource.isInitialized && dataSource.destroy();
            },
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
