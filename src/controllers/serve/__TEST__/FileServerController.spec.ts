import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { once } from "node:events";
import { type IncomingMessage, type Server, createServer, get } from "node:http";
import { Readable } from "node:stream";
import { Configuration } from "@tsed/di";
import { PlatformTest } from "@tsed/platform-http/testing";
import "@tsed/platform-express";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { FileServerController } from "../FileServerController.js";
import { EntryEncryptionWrapper } from "../../../model/rest/EntryEncryptionWrapper.js";
import { FileUploadModel } from "../../../model/db/FileUpload.model.js";
import { FileService } from "../../../services/FileService.js";
import { FileUploadService } from "../../../services/FileUploadService.js";
import { SettingsService } from "../../../services/SettingsService.js";
import { StorageService } from "../../../services/StorageService.js";
import { EncryptionService } from "../../../services/EncryptionService.js";
import { SQLITE_DATA_SOURCE } from "../../../model/di/tokens.js";
import { ThumbnailService } from "../../../services/microServices/thumbnails/thumbnailService.js";
import { StorageProviderManager } from "../../../manager/StorageProviderManager.js";

vi.mock("../../../db/DataSource.js", () => ({ dataSource: {} }));

@Configuration({
    mount: {
        "/f": [FileServerController],
    },
    logger: {
        level: "off",
    },
})
class FileServerTestServer {}

function makeEntry(overrides: Partial<FileUploadModel> = {}): FileUploadModel {
    return Object.assign(new FileUploadModel(), {
        token: "token-1",
        fileName: "abc",
        fileExtension: "png",
        originalFileName: "picture.png",
        mediaType: "image/png",
        fileSize: 11,
        encrypted: false,
        storageBackend: "local",
        settings: null,
        ...overrides,
    });
}

async function readStream(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString("utf8");
}

async function openResponse(server: Server, path: string): Promise<IncomingMessage> {
    server.listen(0);
    await once(server, "listening");

    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error(`Test server is not listening on a TCP port: ${address}`);
    }

    const clientRequest = get(`http://127.0.0.1:${address.port}${path}`);
    const [response] = await once(clientRequest, "response");

    return response;
}

describe("FileServerController", () => {
    const storageService = { $onInit: vi.fn(), openStream: vi.fn(), readAll: vi.fn() };
    const encryptionService = { $onInit: vi.fn(), decryptVerified: vi.fn() };
    const fileService = {
        getEntry: vi.fn(),
        requiresPassword: vi.fn(),
        isFileEncrypted: vi.fn(),
        getFileUrl: vi.fn(),
        processDelete: vi.fn(),
    };
    const fileUploadService = { incrementViews: vi.fn() };
    const settingsService = { getSetting: vi.fn() };
    const thumbnailService = { $afterInit: vi.fn() };
    const storageProviderManager = { $onInit: vi.fn(), $afterInit: vi.fn() };
    const openServers: Server[] = [];

    beforeEach(async () => {
        vi.resetAllMocks();
        fileService.requiresPassword.mockResolvedValue(false);
        fileService.isFileEncrypted.mockResolvedValue(false);
        fileService.getFileUrl.mockResolvedValue(null);
        fileService.processDelete.mockResolvedValue(true);
        fileUploadService.incrementViews.mockResolvedValue(undefined);
        settingsService.getSetting.mockReturnValue("https://waifuvault.moe");

        await PlatformTest.bootstrap(FileServerTestServer, {
            imports: [
                { token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } },
                { token: StorageService, use: storageService },
                { token: EncryptionService, use: encryptionService },
                { token: FileService, use: fileService },
                { token: FileUploadService, use: fileUploadService },
                { token: SettingsService, use: settingsService },
                { token: ThumbnailService, use: thumbnailService },
                { token: StorageProviderManager, use: storageProviderManager },
            ],
        })();
    });

    afterEach(async () => {
        for (const server of openServers.splice(0)) {
            server.closeAllConnections();
            server.close();
        }

        await PlatformTest.reset();
    });

    describe("getFile", () => {
        it("streams an unencrypted file with Content-Length set to the file size", async () => {
            // given
            const entry = makeEntry({ fileSize: 11 });
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("hello world")]));
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(entry));

            // when
            const response = await request(PlatformTest.callback()).get("/f/abc.png").responseType("blob");

            // then
            expect(response.status).toBe(StatusCodes.OK);
            expect(response.body.toString("utf8")).toBe("hello world");
            expect(response.headers["content-length"]).toBe("11");
            expect(response.headers["content-type"]).toBe("image/png");
            expect(storageService.openStream).toHaveBeenCalledWith(entry, undefined);
            expect(storageService.readAll).not.toHaveBeenCalled();
        });

        it("destroys the storage stream when the client disconnects early", async () => {
            // given
            const stream = new Readable({
                read(): void {},
            });
            stream.push("partial");
            storageService.openStream.mockResolvedValue(stream);
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(makeEntry({ fileSize: 1000 })));
            const server = createServer(PlatformTest.callback());
            openServers.push(server);
            const response = await openResponse(server, "/f/abc.png");

            // when
            response.destroy();

            // then
            await vi.waitFor(() => {
                expect(stream.destroyed).toBe(true);
            });
        });

        it("destroys the stream and returns no body for a HEAD request", async () => {
            // given
            const stream = new Readable({
                read(): void {},
            });
            storageService.openStream.mockResolvedValue(stream);
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(makeEntry({ fileSize: 42 })));

            // when
            const response = await request(PlatformTest.callback()).head("/f/abc.png");

            // then
            expect(response.status).toBe(StatusCodes.OK);
            expect(response.headers["content-length"]).toBe("42");
            expect(stream.destroyed).toBe(true);
        });

        it("sends the file as an attachment when download is requested", async () => {
            // given
            const entry = makeEntry({ originalFileName: "my picture.png" });
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("hello world")]));
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(entry));

            // when
            const response = await request(PlatformTest.callback())
                .get("/f/abc.png")
                .query({ download: true })
                .responseType("blob");

            // then
            expect(response.status).toBe(StatusCodes.OK);
            expect(response.body.toString("utf8")).toBe("hello world");
            expect(response.headers["content-disposition"]).toBe('attachment; filename="my picture.png"');
            expect(response.headers["content-type"]).toBe("image/png");
            expect(response.headers["content-length"]).toBe(String(entry.fileSize));
        });

        it("returns the decrypted buffer for an encrypted file", async () => {
            // given
            const entry = makeEntry({ encrypted: true, fileSize: 9 });
            encryptionService.decryptVerified.mockResolvedValue(Buffer.from("plaintext"));
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(entry));

            // when
            const response = await request(PlatformTest.callback())
                .get("/f/abc.png")
                .set("x-password", "hunter2")
                .responseType("blob");

            // then
            expect(response.status).toBe(StatusCodes.OK);
            expect(response.body.toString("utf8")).toBe("plaintext");
            expect(response.headers["content-length"]).toBe("9");
            expect(encryptionService.decryptVerified).toHaveBeenCalledWith(entry, "hunter2");
            expect(storageService.openStream).not.toHaveBeenCalled();
        });

        it("requests exactly the requested byte range for a video and responds 206 with Content-Range", async () => {
            // given
            const entry = makeEntry({ mediaType: "video/mp4", fileExtension: "mp4", fileSize: 1000 });
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("x".repeat(100))]));
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(entry));

            // when
            const response = await request(PlatformTest.callback())
                .get("/f/abc.mp4")
                .set("range", "bytes=100-199")
                .responseType("blob");

            // then
            expect(response.status).toBe(StatusCodes.PARTIAL_CONTENT);
            expect(storageService.openStream).toHaveBeenCalledWith(entry, { start: 100, end: 199 });
            expect(response.headers["content-range"]).toBe("bytes 100-199/1000");
            expect(response.headers["accept-ranges"]).toBe("bytes");
            expect(response.headers["content-length"]).toBe("100");
            expect(response.headers["content-type"]).toBe("video/mp4");
            expect(response.body.toString("utf8")).toBe("x".repeat(100));
        });

        it("clamps an open ended range to the end of the file", async () => {
            // given
            const entry = makeEntry({ mediaType: "video/mp4", fileExtension: "mp4", fileSize: 1000 });
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("y".repeat(100))]));
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(entry));

            // when
            const response = await request(PlatformTest.callback())
                .get("/f/abc.mp4")
                .set("range", "bytes=900-5000")
                .responseType("blob");

            // then
            expect(storageService.openStream).toHaveBeenCalledWith(entry, { start: 900, end: 999 });
            expect(response.headers["content-range"]).toBe("bytes 900-999/1000");
        });

        it("responds 416 when the range start is past the end", async () => {
            // given
            const entry = makeEntry({ mediaType: "video/mp4", fileExtension: "mp4", fileSize: 1000 });
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(entry));

            // when
            const response = await request(PlatformTest.callback())
                .get("/f/abc.mp4")
                .set("range", "bytes=2000-")
                .responseType("blob");

            // then
            expect(response.status).toBe(StatusCodes.REQUESTED_RANGE_NOT_SATISFIABLE);
            expect(response.body.toString("utf8")).toBe("Invalid range");
            expect(storageService.openStream).not.toHaveBeenCalled();
        });

        it("deletes a one time download file once the response finishes", async () => {
            // given
            const entry = makeEntry({ token: "one-time", fileSize: 4, settings: { oneTimeDownload: true } });
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("data")]));
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(entry));

            // when
            await request(PlatformTest.callback()).get("/f/abc.png").responseType("blob");

            // then
            await vi.waitFor(() => {
                expect(fileService.processDelete).toHaveBeenCalledWith(["one-time"]);
            });
            expect(fileUploadService.incrementViews).not.toHaveBeenCalled();
        });

        it("increments views once the response finishes for a normal file", async () => {
            // given
            const entry = makeEntry({ token: "normal", fileSize: 4 });
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("data")]));
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(entry));

            // when
            await request(PlatformTest.callback()).get("/f/abc.png").responseType("blob");

            // then
            await vi.waitFor(() => {
                expect(fileUploadService.incrementViews).toHaveBeenCalledWith("normal");
            });
            expect(fileService.processDelete).not.toHaveBeenCalled();
        });

        it("does not post process before the response finishes", async () => {
            // given
            const stream = new Readable({
                read(): void {},
            });
            stream.push("partial");
            storageService.openStream.mockResolvedValue(stream);
            fileService.getEntry.mockResolvedValue(new EntryEncryptionWrapper(makeEntry({ fileSize: 1000 })));
            const server = createServer(PlatformTest.callback());
            openServers.push(server);

            // when
            await openResponse(server, "/f/abc.png");

            // then
            expect(fileUploadService.incrementViews).not.toHaveBeenCalled();
            expect(fileService.processDelete).not.toHaveBeenCalled();
        });
    });
});

describe("EntryEncryptionWrapper", () => {
    const storageService = { $onInit: vi.fn(), openStream: vi.fn(), readAll: vi.fn() };
    const encryptionService = { $onInit: vi.fn(), decryptVerified: vi.fn() };

    beforeEach(async () => {
        await PlatformTest.create({
            imports: [
                { token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } },
                { token: StorageService, use: storageService },
                { token: EncryptionService, use: encryptionService },
            ],
        });
        vi.resetAllMocks();
    });

    afterEach(PlatformTest.reset);

    it("opens the storage stream with the given range for an unencrypted entry", async () => {
        // given
        const entry = makeEntry();
        const stream = Readable.from([Buffer.from("partial")]);
        storageService.openStream.mockResolvedValue(stream);
        const wrapper = new EntryEncryptionWrapper(entry);

        // when
        const result = await wrapper.getStream(undefined, { start: 5, end: 10 });

        // then
        expect(result).toBe(stream);
        expect(storageService.openStream).toHaveBeenCalledWith(entry, { start: 5, end: 10 });
        expect(storageService.readAll).not.toHaveBeenCalled();
    });

    it("throws when streaming an encrypted entry without a password", async () => {
        // given
        const wrapper = new EntryEncryptionWrapper(makeEntry({ encrypted: true }));

        // when
        const result = wrapper.getStream();

        // then
        await expect(result).rejects.toThrow("Password is required to decrypt file");
        expect(encryptionService.decryptVerified).not.toHaveBeenCalled();
        expect(storageService.openStream).not.toHaveBeenCalled();
    });

    it("streams the decrypted content for an encrypted entry with a password", async () => {
        // given
        const entry = makeEntry({ encrypted: true });
        encryptionService.decryptVerified.mockResolvedValue(Buffer.from("secret contents"));
        const wrapper = new EntryEncryptionWrapper(entry);

        // when
        const result = await wrapper.getStream("hunter2");

        // then
        expect(await readStream(result)).toBe("secret contents");
        expect(encryptionService.decryptVerified).toHaveBeenCalledWith(entry, "hunter2");
        expect(storageService.openStream).not.toHaveBeenCalled();
    });
});
