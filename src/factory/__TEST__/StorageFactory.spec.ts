import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/platform-http/testing";
import { StorageFactory } from "../StorageFactory.js";
import { LocalStorageEngine } from "../../engine/impl/storage/LocalStorageEngine.js";
import { S3StorageEngine } from "../../engine/impl/storage/S3StorageEngine.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";

vi.mock("../../db/DataSource.js", () => ({ dataSource: {} }));

describe("StorageFactory", () => {
    const localEngineMock = { id: "local", enabled: true };
    const s3EngineMock = { id: "s3", enabled: true };
    let factory: StorageFactory;

    beforeEach(async () => {
        await PlatformTest.create({
            imports: [{ token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } }],
        });
        vi.resetAllMocks();
        localEngineMock.enabled = true;
        s3EngineMock.enabled = true;
        s3EngineMock.id = "s3";

        factory = await PlatformTest.invoke<StorageFactory>(StorageFactory, [
            { token: LocalStorageEngine, use: localEngineMock },
            { token: S3StorageEngine, use: s3EngineMock },
        ]);
    });

    afterEach(PlatformTest.reset);

    describe("getEnabledEngines", () => {
        it("returns every engine when all are enabled", () => {
            // when
            const engines = factory.getEnabledEngines();

            // then
            expect(engines).toEqual([localEngineMock, s3EngineMock]);
        });

        it("filters out disabled engines", () => {
            // given
            s3EngineMock.enabled = false;

            // when
            const engines = factory.getEnabledEngines();

            // then
            expect(engines).toEqual([localEngineMock]);
        });
    });

    describe("getEngine", () => {
        it("returns the enabled engine for a backend", () => {
            // when
            const engine = factory.getEngine("s3");

            // then
            expect(engine).toBe(s3EngineMock);
        });

        it("returns null when the engine for the backend is disabled", () => {
            // given
            s3EngineMock.enabled = false;

            // when
            const engine = factory.getEngine("s3");

            // then
            expect(engine).toBeNull();
        });

        it("returns null for a backend with no engine registered under it", () => {
            // given
            s3EngineMock.id = "local";

            // when
            const engine = factory.getEngine("s3");

            // then
            expect(engine).toBeNull();
        });
    });
});
