import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformTest } from "@tsed/platform-http/testing";
import { BadRequest, Forbidden, NotFound } from "@tsed/exceptions";
import { Logger } from "@tsed/logger";
import { FileService } from "../FileService.js";
import { FileRepo } from "../../db/repo/FileRepo.js";
import { EncryptionService } from "../EncryptionService.js";
import { RecordInfoSocket } from "../socket/RecordInfoSocket.js";
import { StorageService } from "../StorageService.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { StorageOperationError } from "../../model/exceptions/StorageOperationError.js";
import { EntryEncryptionWrapper } from "../../model/rest/EntryEncryptionWrapper.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";

vi.mock("../../db/DataSource.js", () => ({ dataSource: {} }));

function makeEntry(overrides: Partial<FileUploadModel> = {}): FileUploadModel {
    return Object.assign(new FileUploadModel(), {
        token: "token-1",
        fileName: "abc",
        fileExtension: "png",
        originalFileName: "cat.png",
        expires: null,
        encrypted: false,
        settings: null,
        storageBackend: "local",
        ...overrides,
    });
}

function errnoError(code: string): NodeJS.ErrnoException {
    const error: NodeJS.ErrnoException = new Error(code);
    error.code = code;
    return error;
}

describe("FileService", () => {
    const repo = { getEntries: vi.fn(), deleteEntries: vi.fn(), getEntryByFileName: vi.fn() };
    const encryptionService = { validatePassword: vi.fn() };
    const recordInfoSocket = { emit: vi.fn() };
    const logger = { warn: vi.fn(), error: vi.fn() };
    const storageService = { delete: vi.fn(), exists: vi.fn() };
    let service: FileService;

    beforeEach(async () => {
        await PlatformTest.create({
            imports: [{ token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } }],
        });
        vi.resetAllMocks();
        repo.deleteEntries.mockResolvedValue(true);
        storageService.delete.mockResolvedValue(undefined);
        storageService.exists.mockResolvedValue(true);

        service = await PlatformTest.invoke<FileService>(FileService, [
            { token: FileRepo, use: repo },
            { token: EncryptionService, use: encryptionService },
            { token: RecordInfoSocket, use: recordInfoSocket },
            { token: Logger, use: logger },
            { token: StorageService, use: storageService },
        ]);
    });

    afterEach(PlatformTest.reset);

    describe("processDelete", () => {
        it("deletes stored objects before the database rows and emits the record socket", async () => {
            // given
            const entry = makeEntry();
            repo.getEntries.mockResolvedValue([entry]);

            // when
            const result = await service.processDelete(["token-1"]);

            // then
            expect(result).toBe(true);
            expect(repo.getEntries).toHaveBeenCalledWith(["token-1"], false);
            expect(storageService.delete).toHaveBeenCalledWith([entry], false);
            expect(repo.deleteEntries).toHaveBeenCalledWith(["token-1"]);
            expect(storageService.delete.mock.invocationCallOrder[0]).toBeLessThan(
                repo.deleteEntries.mock.invocationCallOrder[0],
            );
            expect(recordInfoSocket.emit).toHaveBeenCalledOnce();
        });

        it("passes the soft delete flag through to storage", async () => {
            // given
            const entry = makeEntry();
            repo.getEntries.mockResolvedValue([entry]);

            // when
            await service.processDelete(["token-1"], true);

            // then
            expect(storageService.delete).toHaveBeenCalledWith([entry], true);
        });

        it("returns false without touching storage or the socket when no entries match", async () => {
            // given
            repo.getEntries.mockResolvedValue([]);

            // when
            const result = await service.processDelete(["missing"]);

            // then
            expect(result).toBe(false);
            expect(storageService.delete).not.toHaveBeenCalled();
            expect(repo.deleteEntries).not.toHaveBeenCalled();
            expect(recordInfoSocket.emit).not.toHaveBeenCalled();
        });

        it("still deletes the rows when storage deletion fails so one time downloads cannot be replayed", async () => {
            // given
            repo.getEntries.mockResolvedValue([makeEntry()]);
            storageService.delete.mockRejectedValue(new Error("bucket unreachable"));

            // when
            const result = await service.processDelete(["token-1"]);

            // then
            expect(result).toBe(true);
            expect(repo.deleteEntries).toHaveBeenCalledWith(["token-1"]);
            expect(logger.error).toHaveBeenCalledOnce();
            expect(recordInfoSocket.emit).toHaveBeenCalledOnce();
        });

        it("returns false and does not emit when deleting the rows throws", async () => {
            // given
            const failure = new Error("db down");
            repo.getEntries.mockResolvedValue([makeEntry()]);
            repo.deleteEntries.mockRejectedValue(failure);

            // when
            const result = await service.processDelete(["token-1"]);

            // then
            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(failure);
            expect(recordInfoSocket.emit).not.toHaveBeenCalled();
        });
    });

    describe("deleteFilesFromDisk", () => {
        it("logs EPERM failures as warnings and other failures as errors without throwing", async () => {
            // given
            const eperm = errnoError("EPERM");
            const other = errnoError("EACCES");
            storageService.delete.mockRejectedValue(new StorageOperationError([eperm, other], "failed"));

            // when
            const result = service.deleteFilesFromDisk([makeEntry()]);

            // then
            await expect(result).resolves.toBeUndefined();
            expect(logger.warn).toHaveBeenCalledExactlyOnceWith(eperm);
            expect(logger.error).toHaveBeenCalledExactlyOnceWith(other);
        });

        it("logs a single non aggregate failure", async () => {
            // given
            const eperm = errnoError("EPERM");
            storageService.delete.mockRejectedValue(eperm);

            // when
            await service.deleteFilesFromDisk([makeEntry()], true);

            // then
            expect(storageService.delete).toHaveBeenCalledWith([expect.anything()], true);
            expect(logger.warn).toHaveBeenCalledExactlyOnceWith(eperm);
            expect(logger.error).not.toHaveBeenCalled();
        });
    });

    describe("getEntry", () => {
        it("throws NotFound for an unknown filename", async () => {
            // given
            repo.getEntryByFileName.mockResolvedValue(null);

            // when
            const result = service.getEntry("nope.png");

            // then
            await expect(result).rejects.toBeInstanceOf(NotFound);
            expect(storageService.exists).not.toHaveBeenCalled();
        });

        it("throws NotFound when the requested filename does not match the original", async () => {
            // given
            repo.getEntryByFileName.mockResolvedValue(makeEntry({ originalFileName: "/cat.png" }));

            // when
            const result = service.getEntry("abc.png", "dog.png");

            // then
            await expect(result).rejects.toBeInstanceOf(NotFound);
            expect(repo.getEntries).not.toHaveBeenCalled();
        });

        it("accepts a requested filename that matches the original without its leading slash", async () => {
            // given
            const entry = makeEntry({ originalFileName: "/cat.png" });
            repo.getEntryByFileName.mockResolvedValue(entry);

            // when
            const result = await service.getEntry("abc.png", "cat.png");

            // then
            expect(result).toBeInstanceOf(EntryEncryptionWrapper);
            expect(result.entry).toBe(entry);
        });

        it("deletes an expired entry and throws NotFound", async () => {
            // given
            const entry = makeEntry({ expires: Date.now() - 1000 });
            repo.getEntryByFileName.mockResolvedValue(entry);
            repo.getEntries.mockResolvedValue([entry]);

            // when
            const result = service.getEntry("abc.png");

            // then
            await expect(result).rejects.toBeInstanceOf(NotFound);
            expect(repo.getEntries).toHaveBeenCalledWith(["token-1"], false);
            expect(repo.deleteEntries).toHaveBeenCalledWith(["token-1"]);
        });

        it("deletes the entry and throws NotFound when storage reports the object is missing", async () => {
            // given
            const entry = makeEntry();
            repo.getEntryByFileName.mockResolvedValue(entry);
            repo.getEntries.mockResolvedValue([entry]);
            storageService.exists.mockResolvedValue(false);

            // when
            const result = service.getEntry("abc.png");

            // then
            await expect(result).rejects.toBeInstanceOf(NotFound);
            expect(storageService.exists).toHaveBeenCalledWith(entry);
            expect(repo.deleteEntries).toHaveBeenCalledWith(["token-1"]);
        });

        it("propagates a storage error and keeps the row when existence cannot be determined", async () => {
            // given
            const failure = new Error("connection reset");
            repo.getEntryByFileName.mockResolvedValue(makeEntry());
            storageService.exists.mockRejectedValue(failure);

            // when
            const result = service.getEntry("abc.png");

            // then
            await expect(result).rejects.toBe(failure);
            expect(storageService.delete).not.toHaveBeenCalled();
            expect(repo.deleteEntries).not.toHaveBeenCalled();
        });

        it("throws Forbidden when a protected entry is requested without a password", async () => {
            // given
            repo.getEntryByFileName.mockResolvedValue(makeEntry({ settings: { password: "hash" } }));

            // when
            const result = service.getEntry("abc.png");

            // then
            await expect(result).rejects.toThrow(new Forbidden("Protected file requires a password"));
            expect(encryptionService.validatePassword).not.toHaveBeenCalled();
        });

        it("says the file is encrypted when an encrypted entry is requested without a password", async () => {
            // given
            repo.getEntryByFileName.mockResolvedValue(makeEntry({ encrypted: true, settings: { password: "hash" } }));

            // when
            const result = service.getEntry("abc.png");

            // then
            await expect(result).rejects.toThrow(new Forbidden("Encrypted file requires a password"));
        });

        it("throws Forbidden when the password is wrong", async () => {
            // given
            const entry = makeEntry({ settings: { password: "hash" } });
            repo.getEntryByFileName.mockResolvedValue(entry);
            encryptionService.validatePassword.mockResolvedValue(false);

            // when
            const result = service.getEntry("abc.png", undefined, "wrong");

            // then
            await expect(result).rejects.toThrow(new Forbidden("Password is incorrect"));
            expect(encryptionService.validatePassword).toHaveBeenCalledWith(entry, "wrong");
        });

        it("returns a wrapper around the entry when the password is correct", async () => {
            // given
            const entry = makeEntry({ settings: { password: "hash" } });
            repo.getEntryByFileName.mockResolvedValue(entry);
            encryptionService.validatePassword.mockResolvedValue(true);

            // when
            const result = await service.getEntry("abc.png", undefined, "right");

            // then
            expect(result).toBeInstanceOf(EntryEncryptionWrapper);
            expect(result.entry).toBe(entry);
            expect(repo.deleteEntries).not.toHaveBeenCalled();
        });
    });

    describe("getFileInfo", () => {
        it("returns the entry when it is found and has not expired", async () => {
            // given
            const entry = makeEntry();
            repo.getEntries.mockResolvedValue([entry]);

            // when
            const result = await service.getFileInfo("token-1");

            // then
            expect(result).toBe(entry);
            expect(repo.getEntries).toHaveBeenCalledWith(["token-1"]);
        });

        it("throws BadRequest for an unknown token", async () => {
            // given
            repo.getEntries.mockResolvedValue([]);

            // when
            const result = service.getFileInfo("missing");

            // then
            await expect(result).rejects.toBeInstanceOf(BadRequest);
        });

        it("deletes an expired entry and throws BadRequest", async () => {
            // given
            const entry = makeEntry({ expires: Date.now() - 1000 });
            repo.getEntries.mockResolvedValue([entry]);

            // when
            const result = service.getFileInfo("token-1");

            // then
            await expect(result).rejects.toBeInstanceOf(BadRequest);
            expect(storageService.delete).toHaveBeenCalledWith([entry], false);
            expect(repo.deleteEntries).toHaveBeenCalledWith(["token-1"]);
        });
    });
});
