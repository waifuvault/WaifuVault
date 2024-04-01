import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envsLowMax, initDotEnvLowMax, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { FileUrlService } from "../../FileUrlService.js";
import { PassThrough, Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { ReadableStream } from "node:stream/web";

describe("unit tests", () => {
    function createFetchResponseWithBody(status: number, data: BodyInit, headers: HeadersInit): Response {
        return new Response(data, { status: status, headers: headers });
    }

    beforeEach(() => {
        initDotEnvLowMax();
        const envs = envsLowMax;
        PlatformTest.create({
            envs,
        });
        setUpDataSource();
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
                vi.spyOn(global, "fetch").mockResolvedValue(
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
                vi.spyOn(global, "fetch").mockResolvedValue(
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
                vi.spyOn(global, "fetch").mockResolvedValue(
                    createFetchResponseWithBody(400, "BAD_REQUEST", { "content-length": "200" }),
                );

                // then
                await expect(fileUrlService.getFile("https://waifuvault.moe/somefile.jpg")).rejects.toThrow(
                    "BAD_REQUEST",
                );
            }),
        );

        it(
            "should throw an exception as file size limit reached",
            PlatformTest.inject([FileUrlService], async (fileUrlService: FileUrlService) => {
                // given
                vi.spyOn(global, "fetch").mockResolvedValue(
                    createFetchResponseWithBody(200, "x".repeat(2 * 1024 * 1024), {
                        "content-length": "20",
                    }),
                );

                // then
                await expect(fileUrlService.getFile("https://waifuvault.moe/somefile.jpg")).rejects.toThrow(
                    "File size limit reached while download resource",
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
                const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(responseMock);
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
