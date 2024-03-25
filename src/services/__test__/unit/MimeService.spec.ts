import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/common";
import { envs, initDotEnv, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { MimeService } from "../../MimeService.js";
import { fileTypeFromFile } from "file-type";
import mime from "mime";

describe("unit tests", () => {
    const file = "fakeFile.exe";

    beforeEach(() => {
        initDotEnv();
        PlatformTest.create({
            envs,
        });
        setUpDataSource();
    });

    afterEach(() => {
        vi.clearAllMocks();
        PlatformTest.reset();
    });

    describe("isBlocked", () => {
        it(
            "should return blocked for a mocked filepath",
            PlatformTest.inject([MimeService], async (mimeService: MimeService) => {
                // given
                vi.mock("file-type", () => {
                    return {
                        fileTypeFromFile: vi.fn(() => {
                            return {
                                ext: "foo",
                                mime: "application/x-dosexec",
                            };
                        }),
                    };
                });

                // when
                const didBlock = await mimeService.isBlocked(file);

                // then
                expect(fileTypeFromFile).toBeCalledWith(file);
                expect(didBlock).toBe(true);
            }),
        );
        it(
            "should return blocked for a mocked filepath using mime package",
            PlatformTest.inject([MimeService], async (mimeService: MimeService) => {
                // given
                vi.mock("file-type", () => {
                    return {
                        fileTypeFromFile: vi.fn(() => null),
                    };
                });
                vi.mock("mime", () => {
                    return {
                        default: {
                            getType: vi.fn(() => "application/x-dosexec"),
                        },
                    };
                });

                // when
                const didBlock = await mimeService.isBlocked(file);

                // then
                expect(fileTypeFromFile).toBeCalledWith(file);
                expect(mime.getType).toBeCalledWith(file);
                expect(didBlock).toBe(true);
            }),
        );
    });
});
