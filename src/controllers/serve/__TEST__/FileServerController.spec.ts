import { beforeEach, describe, expect, it, vi } from "vitest";
import { Readable, Writable } from "node:stream";
import type { Request, Response } from "express";
import type { Logger } from "@tsed/logger";
import { StatusCodes } from "http-status-codes";
import { FileServerController } from "../FileServerController.js";
import { EntryEncryptionWrapper } from "../../../model/rest/EntryEncryptionWrapper.js";
import type { FileUploadModel } from "../../../model/db/FileUpload.model.js";
import type { FileService } from "../../../services/FileService.js";
import type { FileUploadService } from "../../../services/FileUploadService.js";
import type { SettingsService } from "../../../services/SettingsService.js";
import type { StorageService } from "../../../services/StorageService.js";
import type { EncryptionService } from "../../../services/EncryptionService.js";

class FakeResponse extends Writable {
    public readonly headers = new Map<string, unknown>();
    public readonly chunks: Buffer[] = [];
    public statusCode = StatusCodes.OK;
    public sentBody: unknown = undefined;
    public attachmentName: string | undefined = undefined;
    public writtenHead: { status: number; headers: Record<string, unknown> } | undefined = undefined;

    public override _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        this.chunks.push(chunk);
        callback();
    }

    public setHeader(name: string, value: unknown): this {
        this.headers.set(name.toLowerCase(), value);
        return this;
    }

    public contentType(type: string): this {
        this.headers.set("content-type", type);
        return this;
    }

    public attachment(name?: string): this {
        this.attachmentName = name;
        return this;
    }

    public writeHead(status: number, headers: Record<string, unknown>): this {
        this.writtenHead = { status, headers };
        return this;
    }

    public status(code: number): this {
        this.statusCode = code;
        return this;
    }

    public send(body: unknown): this {
        this.sentBody = body;
        this.end();
        return this;
    }

    public redirect(): this {
        return this;
    }
}

type FakeRequest = {
    method: string;
    headers: Record<string, string | undefined>;
    path: string;
    originalUrl: string;
};

function createEntry(overrides: Partial<FileUploadModel> = {}): FileUploadModel {
    return {
        token: "token-1",
        fileName: "abc",
        fileExtension: "png",
        originalFileName: "picture.png",
        parsedFileName: "picture.png",
        mediaType: "image/png",
        fileSize: 11,
        encrypted: false,
        storageBackend: "local",
        settings: null,
        ...overrides,
    } as unknown as FileUploadModel;
}

function createRequest(overrides: Partial<FakeRequest> = {}): Request {
    return {
        method: "GET",
        headers: {},
        path: "/f/abc.png",
        originalUrl: "/f/abc.png",
        ...overrides,
    } as unknown as Request;
}

async function readStream(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
    }

    return Buffer.concat(chunks).toString("utf8");
}

describe("FileServerController", () => {
    let storageService: { openStream: ReturnType<typeof vi.fn>; readAll: ReturnType<typeof vi.fn> };
    let encryptionService: { decryptVerified: ReturnType<typeof vi.fn> };
    let fileService: {
        getEntry: ReturnType<typeof vi.fn>;
        requiresPassword: ReturnType<typeof vi.fn>;
        isFileEncrypted: ReturnType<typeof vi.fn>;
        getFileUrl: ReturnType<typeof vi.fn>;
        processDelete: ReturnType<typeof vi.fn>;
    };
    let fileUploadService: { incrementViews: ReturnType<typeof vi.fn> };
    let logger: { error: ReturnType<typeof vi.fn> };
    let controller: FileServerController;

    function serve(entry: FileUploadModel): void {
        fileService.getEntry.mockResolvedValue(
            new EntryEncryptionWrapper(
                entry,
                encryptionService as unknown as EncryptionService,
                storageService as unknown as StorageService,
            ),
        );
    }

    beforeEach(() => {
        storageService = {
            openStream: vi.fn(),
            readAll: vi.fn(),
        };
        encryptionService = {
            decryptVerified: vi.fn(),
        };
        fileService = {
            getEntry: vi.fn(),
            requiresPassword: vi.fn().mockResolvedValue(false),
            isFileEncrypted: vi.fn().mockResolvedValue(false),
            getFileUrl: vi.fn().mockResolvedValue(null),
            processDelete: vi.fn().mockResolvedValue(true),
        };
        fileUploadService = {
            incrementViews: vi.fn().mockResolvedValue(undefined),
        };
        logger = {
            error: vi.fn(),
        };
        const settingsService = {
            getSetting: vi.fn().mockReturnValue("https://waifuvault.moe"),
        };
        controller = new FileServerController(
            fileService as unknown as FileService,
            fileUploadService as unknown as FileUploadService,
            logger as unknown as Logger,
            settingsService as unknown as SettingsService,
        );
    });

    describe("getFile", () => {
        it("returns the storage stream for an unencrypted file with Content-Length set to the file size", async () => {
            // given
            const entry = createEntry({ fileSize: 11 });
            const stream = Readable.from([Buffer.from("hello world")]);
            storageService.openStream.mockResolvedValue(stream);
            serve(entry);
            const res = new FakeResponse();

            // when
            const result = await controller.getFile(res as unknown as Response, createRequest(), "abc.png");

            // then
            expect(result).toBe(stream);
            expect(Buffer.isBuffer(result)).toBe(false);
            expect(res.headers.get("content-length")).toBe(11);
            expect(res.headers.get("content-type")).toBe("image/png");
            expect(storageService.openStream).toHaveBeenCalledWith(entry, undefined);
            expect(storageService.readAll).not.toHaveBeenCalled();
        });

        it("destroys the storage stream when the response closes early", async () => {
            // given
            const stream = new Readable({
                read(): void {},
            });
            storageService.openStream.mockResolvedValue(stream);
            serve(createEntry());
            const res = new FakeResponse();
            await controller.getFile(res as unknown as Response, createRequest(), "abc.png");

            // when
            res.emit("close");

            // then
            expect(stream.destroyed).toBe(true);
        });

        it("destroys the stream and returns no body for a HEAD request", async () => {
            // given
            const stream = new Readable({
                read(): void {},
            });
            storageService.openStream.mockResolvedValue(stream);
            serve(createEntry({ fileSize: 42 }));
            const res = new FakeResponse();

            // when
            const result = await controller.getFile(
                res as unknown as Response,
                createRequest({ method: "HEAD" }),
                "abc.png",
            );

            // then
            expect(result).toBeUndefined();
            expect(stream.destroyed).toBe(true);
            expect(res.headers.get("content-length")).toBe(42);
        });

        it("sets the attachment and returns the stream when download is requested", async () => {
            // given
            const entry = createEntry({ parsedFileName: "my picture.png" } as Partial<FileUploadModel>);
            const stream = Readable.from([Buffer.from("hello world")]);
            storageService.openStream.mockResolvedValue(stream);
            serve(entry);
            const res = new FakeResponse();

            // when
            const result = await controller.getFile(
                res as unknown as Response,
                createRequest(),
                "abc.png",
                undefined,
                undefined,
                true,
            );

            // then
            expect(result).toBe(stream);
            expect(res.attachmentName).toBe("my picture.png");
            expect(res.headers.get("content-type")).toBe("image/png");
            expect(res.headers.get("content-length")).toBe(entry.fileSize);
        });

        it("returns the decrypted buffer for an encrypted file", async () => {
            // given
            const entry = createEntry({ encrypted: true, fileSize: 9 });
            const decrypted = Buffer.from("plaintext");
            encryptionService.decryptVerified.mockResolvedValue(decrypted);
            serve(entry);
            const res = new FakeResponse();

            // when
            const result = await controller.getFile(res as unknown as Response, createRequest(), "abc.png", "hunter2");

            // then
            expect(result).toBe(decrypted);
            expect(encryptionService.decryptVerified).toHaveBeenCalledWith(entry, "hunter2");
            expect(storageService.openStream).not.toHaveBeenCalled();
            expect(res.headers.get("content-length")).toBe(9);
        });

        it("requests exactly the requested byte range for a video and writes 206 with Content-Range", async () => {
            // given
            const entry = createEntry({ mediaType: "video/mp4", fileExtension: "mp4", fileSize: 1000 });
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("x".repeat(100))]));
            serve(entry);
            const res = new FakeResponse();

            // when
            const result = await controller.getFile(
                res as unknown as Response,
                createRequest({ headers: { range: "bytes=100-199" } }),
                "abc.mp4",
            );

            // then
            expect(result).toBeUndefined();
            expect(storageService.openStream).toHaveBeenCalledWith(entry, { start: 100, end: 199 });
            expect(res.headers.get("accept-ranges")).toBe("bytes");
            expect(res.writtenHead).toEqual({
                status: StatusCodes.PARTIAL_CONTENT,
                headers: {
                    "Content-Range": "bytes 100-199/1000",
                    "Accept-Ranges": "bytes",
                    "Content-Length": 100,
                    "Content-Type": "video/mp4",
                },
            });
            expect(Buffer.concat(res.chunks).toString("utf8")).toBe("x".repeat(100));
        });

        it("clamps an open ended range to the end of the file", async () => {
            // given
            const entry = createEntry({ mediaType: "video/mp4", fileExtension: "mp4", fileSize: 1000 });
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("y")]));
            serve(entry);
            const res = new FakeResponse();

            // when
            await controller.getFile(
                res as unknown as Response,
                createRequest({ headers: { range: "bytes=900-5000" } }),
                "abc.mp4",
            );

            // then
            expect(storageService.openStream).toHaveBeenCalledWith(entry, { start: 900, end: 999 });
            expect(res.writtenHead?.headers["Content-Range"]).toBe("bytes 900-999/1000");
        });

        it("responds 416 when the range start is past the end", async () => {
            // given
            const entry = createEntry({ mediaType: "video/mp4", fileExtension: "mp4", fileSize: 1000 });
            serve(entry);
            const res = new FakeResponse();

            // when
            await controller.getFile(
                res as unknown as Response,
                createRequest({ headers: { range: "bytes=2000-" } }),
                "abc.mp4",
            );

            // then
            expect(res.statusCode).toBe(StatusCodes.REQUESTED_RANGE_NOT_SATISFIABLE);
            expect(res.sentBody).toBe("Invalid range");
            expect(storageService.openStream).not.toHaveBeenCalled();
        });

        it("deletes a one time download file once the response finishes", async () => {
            // given
            const entry = createEntry({
                token: "one-time",
                settings: { oneTimeDownload: true },
            } as Partial<FileUploadModel>);
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("data")]));
            serve(entry);
            const res = new FakeResponse();
            await controller.getFile(res as unknown as Response, createRequest(), "abc.png");

            // when
            res.emit("finish");
            await new Promise(setImmediate);

            // then
            expect(fileService.processDelete).toHaveBeenCalledWith(["one-time"]);
            expect(fileUploadService.incrementViews).not.toHaveBeenCalled();
        });

        it("increments views once the response finishes for a normal file", async () => {
            // given
            const entry = createEntry({ token: "normal" });
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("data")]));
            serve(entry);
            const res = new FakeResponse();
            await controller.getFile(res as unknown as Response, createRequest(), "abc.png");

            // when
            res.emit("finish");
            await new Promise(setImmediate);

            // then
            expect(fileUploadService.incrementViews).toHaveBeenCalledWith("normal");
            expect(fileService.processDelete).not.toHaveBeenCalled();
        });

        it("does not post process before the response finishes", async () => {
            // given
            storageService.openStream.mockResolvedValue(Readable.from([Buffer.from("data")]));
            serve(createEntry());
            const res = new FakeResponse();

            // when
            await controller.getFile(res as unknown as Response, createRequest(), "abc.png");
            await new Promise(setImmediate);

            // then
            expect(fileUploadService.incrementViews).not.toHaveBeenCalled();
            expect(fileService.processDelete).not.toHaveBeenCalled();
        });
    });
});

describe("EntryEncryptionWrapper", () => {
    it("opens the storage stream with the given range for an unencrypted entry", async () => {
        // given
        const entry = createEntry();
        const stream = Readable.from([Buffer.from("partial")]);
        const storageService = {
            openStream: vi.fn().mockResolvedValue(stream),
            readAll: vi.fn(),
        };
        const wrapper = new EntryEncryptionWrapper(entry, undefined, storageService as unknown as StorageService);

        // when
        const result = await wrapper.getStream(undefined, { start: 5, end: 10 });

        // then
        expect(result).toBe(stream);
        expect(storageService.openStream).toHaveBeenCalledWith(entry, { start: 5, end: 10 });
        expect(storageService.readAll).not.toHaveBeenCalled();
    });

    it("throws when streaming an encrypted entry without a password", async () => {
        // given
        const entry = createEntry({ encrypted: true });
        const storageService = {
            openStream: vi.fn(),
            readAll: vi.fn(),
        };
        const encryptionService = {
            decryptVerified: vi.fn(),
        };
        const wrapper = new EntryEncryptionWrapper(
            entry,
            encryptionService as unknown as EncryptionService,
            storageService as unknown as StorageService,
        );

        // when
        const result = wrapper.getStream();

        // then
        await expect(result).rejects.toThrow("Password is required to decrypt file");
        expect(encryptionService.decryptVerified).not.toHaveBeenCalled();
        expect(storageService.openStream).not.toHaveBeenCalled();
    });

    it("streams the decrypted content for an encrypted entry with a password", async () => {
        // given
        const entry = createEntry({ encrypted: true });
        const encryptionService = {
            decryptVerified: vi.fn().mockResolvedValue(Buffer.from("secret contents")),
        };
        const storageService = {
            openStream: vi.fn(),
            readAll: vi.fn(),
        };
        const wrapper = new EntryEncryptionWrapper(
            entry,
            encryptionService as unknown as EncryptionService,
            storageService as unknown as StorageService,
        );

        // when
        const result = await wrapper.getStream("hunter2");

        // then
        expect(await readStream(result)).toBe("secret contents");
        expect(encryptionService.decryptVerified).toHaveBeenCalledWith(entry, "hunter2");
        expect(storageService.openStream).not.toHaveBeenCalled();
    });
});
