import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { envs, initDotEnv, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { FileUrlService } from "../../FileUrlService.js";

describe("unit tests", () => {
    let fetchSpy: Mock;

    function createFetchResponseWithBody(status: number, data: BodyInit, headers: HeadersInit): Response {
        return new Response(data, { status: status, headers: headers });
    }

    beforeEach(() => {
        initDotEnv();
        PlatformTest.create({
            envs,
        });
        setUpDataSource();
        fetchSpy = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
        PlatformTest.reset();
    });

    vi.mock("node:fs");

    describe("getFile", () => {
        it(
            "should download URL",
            PlatformTest.inject([FileUrlService], async (fileUrlService: FileUrlService) => {
                // given
                fetchSpy.mockResolvedValueOnce(
                    createFetchResponseWithBody(200, "01234567890123456789", { "content-length": "20" }),
                );
                fetchSpy.mockResolvedValueOnce(
                    createFetchResponseWithBody(200, "01234567890123456789", { "content-length": "20" }),
                );

                // when
                await fileUrlService.getFile("https://waifuvault.moe/somefile.jpg");

                // then
                expect(fetchSpy).toHaveBeenNthCalledWith(1, "https://waifuvault.moe/somefile.jpg", { method: "HEAD" });
                expect(fetchSpy).toHaveBeenNthCalledWith(2, "https://waifuvault.moe/somefile.jpg", { method: "GET" });
            }),
        );
    });
});
