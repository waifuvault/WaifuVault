import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { envs, initDotEnv, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { FileUrlService } from "../../FileUrlService.js";
import { PassThrough, Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { ReadableStream } from "node:stream/web";

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
    vi.mock("node:stream", async importOriginal => {
        return {
            ...(await importOriginal<typeof import("node:stream")>()),
        };
    });
    vi.mock("node:stream/promises");

    describe("getFile", () => {
        it(
            "should throw an exception as too large",
            PlatformTest.inject([FileUrlService], async (fileUrlService: FileUrlService) => {
                // given
                fetchSpy.mockResolvedValue(
                    createFetchResponseWithBody(200, "01234567890123456789", { "content-length": "2000000000000000" }),
                );

                // then
                await expect(fileUrlService.getFile("https://waifuvault.moe/somefile.jpg")).rejects.toThrow(
                    "file too big",
                );
            }),
        );

        it(
            "should throw an exception as localhost requested",
            PlatformTest.inject([FileUrlService], async (fileUrlService: FileUrlService) => {
                // given
                fetchSpy.mockResolvedValue(
                    createFetchResponseWithBody(200, "01234567890123456789", { "content-length": "200" }),
                );

                // then
                await expect(fileUrlService.getFile("https://localhost/somefile.jpg")).rejects.toThrow(
                    "Unable to accept URL",
                );
            }),
        );

        it(
            "should throw an exception as bad request returned",
            PlatformTest.inject([FileUrlService], async (fileUrlService: FileUrlService) => {
                // given
                fetchSpy.mockResolvedValue(
                    createFetchResponseWithBody(400, "BAD_REQUEST", { "content-length": "200" }),
                );

                // then
                await expect(fileUrlService.getFile("https://waifuvault.moe/somefile.jpg")).rejects.toThrow(
                    "BAD_REQUEST",
                );
            }),
        );

        it(
            "should download URL",
            PlatformTest.inject([FileUrlService], async (fileUrlService: FileUrlService) => {
                // given
                const mockedStream = new PassThrough();
                const responseMock = createFetchResponseWithBody(200, "01234567890123456789", {
                    "content-length": "20",
                });
                fetchSpy.mockResolvedValue(responseMock);
                const streamMock = Readable.from([responseMock.body]);
                const pipeMock = vi.spyOn(streamMock, "pipe").mockImplementation(() => mockedStream);
                const fromWebMock = vi.spyOn(Readable, "fromWeb").mockImplementation(() => streamMock);
                const finishedMock = vi.mocked(finished).mockResolvedValue();
                const bodyStream = ReadableStream.from([responseMock.body]);
                // when
                await fileUrlService.getFile("https://waifuvault.moe/somefile.jpg");

                // then
                expect(fetchSpy).toHaveBeenNthCalledWith(1, "https://waifuvault.moe/somefile.jpg", { method: "HEAD" });
                expect(fetchSpy).toHaveBeenNthCalledWith(
                    2,
                    "https://waifuvault.moe/somefile.jpg",
                    expect.objectContaining({ method: "GET" }),
                );
                expect(fromWebMock).toHaveBeenCalledWith(expect.objectContaining(bodyStream));
                expect(pipeMock).toHaveBeenCalledWith(undefined); // the file does not exist on disk, thus `fs.createWriteStream` will be undefined
                expect(finishedMock).toHaveBeenCalledWith(mockedStream);
            }),
        );
    });
});
