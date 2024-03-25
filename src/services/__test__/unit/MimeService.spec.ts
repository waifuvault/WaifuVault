import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/common";
import { envs, initDotEnv, setUpDataSource } from "../../../__test__/testUtils.spec.js";
import { MimeService } from "../../MimeService.js";
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";
import mime from "mime";

describe("unit tests", () => {
    beforeEach(() => {
        initDotEnv();
        PlatformTest.create({
            envs,
        });
        setUpDataSource();
    });

    afterEach(() => {
        vi.resetModules();
        PlatformTest.reset();
    });

    vi.mock("file-type");
    vi.mock("mime");

    describe("findMimeTypeFromBuffer", () => {
        it(
            "should get the mineType from a buffer without a resourceName",
            PlatformTest.inject([MimeService], async (mimeService: MimeService) => {
                // given
                const spy = vi.mocked(fileTypeFromBuffer).mockResolvedValue({
                    ext: "jpg",
                    mime: "image/jpeg",
                });
                const buffer = Buffer.from("fake");

                // when
                const didBlock = await mimeService.findMimeTypeFromBuffer(buffer);

                // then
                expect(spy).toBeCalledWith(buffer);
                expect(didBlock).toBe("image/jpeg");
            }),
        );
    });

    describe("isBlocked", () => {
        const file = "fakeFile.exe";

        it(
            "should return blocked for a mocked filepath",
            PlatformTest.inject([MimeService], async (mimeService: MimeService) => {
                // given
                const spy = vi.mocked(fileTypeFromFile).mockResolvedValue({
                    ext: "jpg",
                    mime: "image/jpeg",
                });
                // when
                const didBlock = await mimeService.isBlocked(file);

                // then
                expect(spy).toBeCalledWith(file);
                expect(didBlock).toBe(true);
            }),
        );
        it(
            "should return blocked for a mocked filepath using mime package",
            PlatformTest.inject([MimeService], async (mimeService: MimeService) => {
                // given
                const fileTypeSpy = vi.mocked(fileTypeFromFile).mockResolvedValue(undefined);
                const spy = vi.mocked(mime.getType).mockResolvedValue("application/x-dosexec");

                // when
                const didBlock = await mimeService.isBlocked(file);

                // then
                expect(fileTypeSpy).toBeCalledWith(file);
                expect(spy).toBeCalledWith(file);
                expect(didBlock).toBe(true);
            }),
        );
    });
});
