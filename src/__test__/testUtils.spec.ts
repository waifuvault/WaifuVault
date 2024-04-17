import { PlatformTest } from "@tsed/common";
import { SQLITE_DATA_SOURCE } from "../model/di/tokens.js";
import { vi } from "vitest";
import dotenv from "dotenv";
import path from "path";

export function overrideConstant<T extends object>(obj: T, prop: string, newValue: string): void {
    Reflect.deleteProperty(obj, prop);
    Reflect.defineProperty(obj, prop, {
        get: () => newValue,
    });
}

export function initDotEnv(): void {
    dotenv.config({
        path: path.resolve(process.cwd(), ".test.env"),
        override: true,
    });
}

export async function platformCreate(settings?: Partial<TsED.Configuration>): Promise<void> {
    initDotEnv();
    const mockDS = {
        initialize: vi.fn(),
        getRepository: vi.fn(),
    };
    /* registerProvider<DataSource>({
        provide: SQLITE_DATA_SOURCE,
        type: "typeorm:datasource",
        useValue: mockDS,
    });*/
    await PlatformTest.create({
        ...settings,
        imports: [
            {
                token: SQLITE_DATA_SOURCE,
                use: mockDS,
            },
        ],
        envs,
    });
}

export const envs = {
    ...process.env,
    ...dotenv.config({
        path: path.resolve(process.cwd(), ".test.env"),
    }).parsed,
};
