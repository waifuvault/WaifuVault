import {DataSource} from "typeorm";
import {PlatformTest} from "@tsed/common";
import {SQLITE_DATA_SOURCE} from "../model/di/tokens.js";
import {jest} from "@jest/globals";
import dotenv from 'dotenv';
import path from "path";

export function setUpDataSource(ds?: DataSource): void {

    const settings = {
        provide: SQLITE_DATA_SOURCE,
        type: "typeorm:datasource",
    };
    if (ds) {
        PlatformTest.injector.addProvider(SQLITE_DATA_SOURCE, {
            ...settings,
            useAsyncFactory: async () => {
                await ds.initialize();
            }
        });
    } else {
        // mock the datasource
        const mockDS = {
            initialize: jest.fn(),
            getRepository: jest.fn()
        };

        PlatformTest.injector.addProvider(SQLITE_DATA_SOURCE, {
            provide: SQLITE_DATA_SOURCE,
            type: "typeorm:datasource",
            useValue: mockDS
        });
    }
}

export function initDotEnv(): void {
    dotenv.config({
        path: path.resolve(process.cwd(), '.test.env')
    });
}
