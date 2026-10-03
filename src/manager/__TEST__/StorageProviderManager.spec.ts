import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/platform-http/testing";
import { Logger } from "@tsed/logger";
import { StorageProviderManager } from "../StorageProviderManager.js";
import { StorageFactory } from "../../factory/StorageFactory.js";
import { SettingsService } from "../../services/SettingsService.js";
import { GlobalEnv } from "../../model/constants/GlobalEnv.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";

vi.mock("../../db/DataSource.js", () => ({ dataSource: {} }));

describe("StorageProviderManager", () => {
    const localEngineMock = { id: "local", enabled: true };
    const s3EngineMock = { id: "s3", enabled: true };
    const factoryMock = { getEnabledEngines: vi.fn(), getEngine: vi.fn() };
    const settingsService = { getSetting: vi.fn() };
    const loggerMock = { info: vi.fn() };
    const backendError =
        /STORAGE_BACKEND is "(.*)" but no storage engine is enabled for it\. Valid values are "local" and "s3"/;
    let manager: StorageProviderManager;

    beforeEach(async () => {
        await PlatformTest.create({
            imports: [{ token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } }],
        });
        vi.resetAllMocks();
        factoryMock.getEnabledEngines.mockReturnValue([localEngineMock, s3EngineMock]);
        factoryMock.getEngine.mockImplementation(backend => {
            if (backend === "local") {
                return localEngineMock;
            }
            if (backend === "s3") {
                return s3EngineMock;
            }
            return null;
        });
        settingsService.getSetting.mockReturnValue("local");

        manager = await PlatformTest.invoke<StorageProviderManager>(StorageProviderManager, [
            { token: StorageFactory, use: factoryMock },
            { token: SettingsService, use: settingsService },
            { token: Logger, use: loggerMock },
        ]);
    });

    afterEach(PlatformTest.reset);

    describe("$onInit", () => {
        it("caches the enabled engines and logs their backends when invoked", () => {
            // then
            expect(factoryMock.getEnabledEngines).toHaveBeenCalledTimes(1);
            expect(manager.engines).toEqual([localEngineMock, s3EngineMock]);
            expect(loggerMock.info).toHaveBeenCalledWith("Storage engines enabled: local, s3");
        });

        it("does not query the factory again when the engines are read", () => {
            // when
            const engines = manager.engines;

            // then
            expect(engines).toEqual([localEngineMock, s3EngineMock]);
            expect(factoryMock.getEnabledEngines).toHaveBeenCalledTimes(1);
        });
    });

    describe("backends", () => {
        it("returns the ids of the cached engines", () => {
            // when
            const backends = manager.backends;

            // then
            expect(backends).toEqual(["local", "s3"]);
        });

        it("returns only the enabled backends when s3 is not configured", async () => {
            // given
            factoryMock.getEnabledEngines.mockReturnValue([localEngineMock]);
            const localOnlyManager = await PlatformTest.invoke<StorageProviderManager>(StorageProviderManager, [
                { token: StorageFactory, use: factoryMock },
                { token: SettingsService, use: settingsService },
                { token: Logger, use: loggerMock },
            ]);

            // when
            const backends = localOnlyManager.backends;

            // then
            expect(backends).toEqual(["local"]);
            expect(localOnlyManager.engines).toEqual([localEngineMock]);
            expect(loggerMock.info).toHaveBeenCalledWith("Storage engines enabled: local");
        });
    });

    describe("activeEngine", () => {
        it("returns the engine for the configured STORAGE_BACKEND", () => {
            // given
            settingsService.getSetting.mockReturnValue("s3");

            // when
            const engine = manager.activeEngine;

            // then
            expect(engine).toBe(s3EngineMock);
            expect(settingsService.getSetting).toHaveBeenCalledWith(GlobalEnv.STORAGE_BACKEND);
            expect(factoryMock.getEngine).toHaveBeenCalledWith("s3");
        });

        it("throws the STORAGE_BACKEND error for an unknown value", () => {
            // given
            settingsService.getSetting.mockReturnValue("azure");

            // when
            const read = (): unknown => manager.activeEngine;

            // then
            expect(read).toThrow(backendError);
            expect(read).toThrow('STORAGE_BACKEND is "azure"');
        });

        it("throws the STORAGE_BACKEND error when s3 is selected but not configured", () => {
            // given
            settingsService.getSetting.mockReturnValue("s3");
            factoryMock.getEngine.mockReturnValue(null);

            // when
            const read = (): unknown => manager.activeEngine;

            // then
            expect(read).toThrow(backendError);
            expect(read).toThrow('STORAGE_BACKEND is "s3"');
        });
    });

    describe("engineFor", () => {
        it("returns the enabled engine for a backend", () => {
            // when
            const engine = manager.engineFor("local");

            // then
            expect(engine).toBe(localEngineMock);
            expect(factoryMock.getEngine).toHaveBeenCalledWith("local");
        });

        it("throws for a backend with no enabled engine", () => {
            // given
            factoryMock.getEngine.mockReturnValue(null);

            // when
            const resolve = (): unknown => manager.engineFor("s3");

            // then
            expect(resolve).toThrow('No storage engine is enabled for backend "s3"');
        });
    });

    describe("$afterInit", () => {
        it("logs the active engine", () => {
            // given
            settingsService.getSetting.mockReturnValue("s3");

            // when
            manager.$afterInit();

            // then
            expect(loggerMock.info).toHaveBeenCalledWith("New uploads are stored with the s3 storage engine");
        });

        it("throws when STORAGE_BACKEND has no enabled engine", () => {
            // given
            settingsService.getSetting.mockReturnValue("azure");

            // when
            const start = (): void => manager.$afterInit();

            // then
            expect(start).toThrow(backendError);
            expect(loggerMock.info).not.toHaveBeenCalledWith(expect.stringContaining("New uploads are stored"));
        });
    });
});
