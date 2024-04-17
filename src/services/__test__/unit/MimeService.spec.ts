import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/common";
import { platformCreate } from "../../../__test__/testUtils.spec.js";
import { MimeService } from "../../MimeService.js";
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";
import mime from "mime";

describe("unit tests", () => {
    beforeEach(async () => {
        await platformCreate();
    });

    afterEach(() => {
        vi.clearAllMocks();
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
                const mimeType = await mimeService.findMimeTypeFromBuffer(buffer);

                // then
                expect(spy).toBeCalledWith(buffer);
                expect(mimeType).toBe("image/jpeg");
            }),
        );
        it(
            "should get the mineType from a buffer with a resourceName calling buffer first",
            PlatformTest.inject([MimeService], async (mimeService: MimeService) => {
                // given
                const bufferSpy = vi.mocked(fileTypeFromBuffer).mockResolvedValue(undefined);
                const fileNameSpy = vi.mocked(mime.getType).mockResolvedValue("image/jpeg");
                const buffer = Buffer.from("fake");
                const fileName = "fake.jpg";

                // when
                const mimeType = await mimeService.findMimeTypeFromBuffer(buffer, fileName);

                // then
                expect(bufferSpy).toBeCalledWith(buffer);
                expect(fileNameSpy).toBeCalledWith(fileName);
                expect(mimeType).toBe("image/jpeg");
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
