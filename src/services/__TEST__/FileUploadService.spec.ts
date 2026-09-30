import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { Logger } from "@tsed/logger";
import type { PlatformMulterFile } from "@tsed/platform-multer";
import { BadRequest, Forbidden, InternalServerError } from "@tsed/exceptions";
import { FileUploadService } from "../FileUploadService.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { FileUtils } from "../../utils/Utils.js";
import type { FileRepo } from "../../db/repo/FileRepo.js";
import type { FileUrlService } from "../FileUrlService.js";
import type { MimeService } from "../MimeService.js";
import type { EncryptionService } from "../EncryptionService.js";
import type { RecordInfoSocket } from "../socket/RecordInfoSocket.js";
import type { FileService } from "../FileService.js";
import type { BucketService } from "../BucketService.js";
import type { FileFilterManager } from "../../manager/FileFilterManager.js";
import type { FileReputationService } from "../FileReputationService.js";
import type { StorageService } from "../StorageService.js";
import type { SettingsService } from "../SettingsService.js";
import type { IFileFilter } from "../../engine/IFileFilter.js";
import type { FileUploadProps } from "../../utils/typeings.js";

const maxFileSize = 100 * 1048576;

function buildFakes(): {
    repo: {
        getEntriesFromChecksum: ReturnType<typeof vi.fn>;
        saveEntry: ReturnType<typeof vi.fn>;
        getEntries: ReturnType<typeof vi.fn>;
    };
    fileUrlService: { getFile: ReturnType<typeof vi.fn> };
    mimeService: { findMimeType: ReturnType<typeof vi.fn> };
    logger: { error: ReturnType<typeof vi.fn> };
    encryptionService: {
        encryptFile: ReturnType<typeof vi.fn>;
        encryptEntry: ReturnType<typeof vi.fn>;
        decrypt: ReturnType<typeof vi.fn>;
        changePassword: ReturnType<typeof vi.fn>;
    };
    recordInfoSocket: { emit: ReturnType<typeof vi.fn> };
    fileService: { processDelete: ReturnType<typeof vi.fn> };
    bucketService: { bucketExists: ReturnType<typeof vi.fn>; getBucket: ReturnType<typeof vi.fn> };
    fileFilterManager: { process: ReturnType<typeof vi.fn> };
    fileReputationService: { enqueueFile: ReturnType<typeof vi.fn> };
    storageService: {
        commit: ReturnType<typeof vi.fn>;
        removeStaged: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        write: ReturnType<typeof vi.fn>;
    };
    settingsService: { getSetting: ReturnType<typeof vi.fn>; getMaxFileSize: ReturnType<typeof vi.fn> };
} {
    return {
        repo: {
            getEntriesFromChecksum: vi.fn().mockResolvedValue([]),
            saveEntry: vi.fn((entry: FileUploadModel) => Promise.resolve(entry)),
            getEntries: vi.fn().mockResolvedValue([]),
        },
        fileUrlService: { getFile: vi.fn() },
        mimeService: { findMimeType: vi.fn().mockResolvedValue("text/plain") },
        logger: { error: vi.fn() },
        encryptionService: {
            encryptFile: vi.fn().mockResolvedValue(true),
            encryptEntry: vi.fn().mockResolvedValue(true),
            decrypt: vi.fn(),
            changePassword: vi.fn().mockResolvedValue(undefined),
        },
        recordInfoSocket: { emit: vi.fn() },
        fileService: { processDelete: vi.fn().mockResolvedValue(1) },
        bucketService: { bucketExists: vi.fn().mockResolvedValue(true), getBucket: vi.fn().mockResolvedValue(null) },
        fileFilterManager: { process: vi.fn().mockResolvedValue([]) },
        fileReputationService: { enqueueFile: vi.fn() },
        storageService: {
            commit: vi.fn().mockResolvedValue("s3"),
            removeStaged: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
            write: vi.fn().mockResolvedValue(undefined),
        },
        settingsService: {
            getSetting: vi.fn().mockReturnValue(null),
            getMaxFileSize: vi.fn().mockReturnValue(maxFileSize),
        },
    };
}

type Fakes = ReturnType<typeof buildFakes>;

function existingEntry(overrides: Partial<FileUploadModel>): FileUploadModel {
    const entry = new FileUploadModel();
    entry.token = "existing-token";
    entry.ip = "1.1.1.1";
    entry.fileName = "existing";
    entry.fileExtension = "txt";
    entry.originalFileName = "existing.txt";
    entry.fileSize = 10;
    entry.expires = Date.now() + 60_000;
    entry.encrypted = false;
    entry.settings = null;
    entry.storageBackend = "local";
    entry.createdAt = new Date();
    return Object.assign(entry, overrides);
}

describe("FileUploadService", () => {
    let tempDir: string;
    let stagedPath: string;
    let checksum: string;
    let fakes: Fakes;
    let service: FileUploadService;

    const fileContents = "hello waifuvault";

    function multerSource(): PlatformMulterFile {
        return { path: stagedPath, originalname: "picture.txt" } as PlatformMulterFile;
    }

    function uploadProps(overrides: Partial<FileUploadProps> = {}): FileUploadProps {
        return {
            ip: "1.1.1.1",
            source: multerSource(),
            options: {},
            ...overrides,
        } as FileUploadProps;
    }

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fileuploadservice-"));
        stagedPath = path.join(tempDir, "staged-name");
        await fs.writeFile(stagedPath, fileContents);
        checksum = crypto.createHash("md5").update(fileContents).digest("hex");
        fakes = buildFakes();
        service = new FileUploadService(
            fakes.repo as unknown as FileRepo,
            fakes.fileUrlService as unknown as FileUrlService,
            fakes.mimeService as unknown as MimeService,
            fakes.logger as unknown as Logger,
            fakes.encryptionService as unknown as EncryptionService,
            fakes.recordInfoSocket as unknown as RecordInfoSocket,
            fakes.fileService as unknown as FileService,
            fakes.bucketService as unknown as BucketService,
            fakes.fileFilterManager as unknown as FileFilterManager,
            fakes.fileReputationService as unknown as FileReputationService,
            fakes.storageService as unknown as StorageService,
            fakes.settingsService as unknown as SettingsService,
        );
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe("processUpload", () => {
        it("commits the staged multer file and saves the backend returned by commit", async () => {
            // given
            fakes.storageService.commit.mockResolvedValue("s3");

            // when
            const [saved, duplicate] = await service.processUpload(uploadProps());

            // then
            expect(duplicate).toBe(false);
            expect(fakes.storageService.commit).toHaveBeenCalledTimes(1);
            const [committedPath, committedEntry] = fakes.storageService.commit.mock.calls[0] as [
                string,
                FileUploadModel,
            ];
            expect(committedPath).toBe(stagedPath);
            expect(committedEntry.fileName).toBe("staged-name");
            expect(committedEntry.fileExtension).toBe("txt");
            expect(committedEntry.originalFileName).toBe("picture.txt");
            expect(committedEntry.checksum).toBe(checksum);
            expect(committedEntry.fileSize).toBe(fileContents.length);
            expect(fakes.repo.saveEntry).toHaveBeenCalledTimes(1);
            const savedArg = fakes.repo.saveEntry.mock.calls[0][0] as FileUploadModel;
            expect(savedArg.storageBackend).toBe("s3");
            expect(saved.storageBackend).toBe("s3");
            expect(fakes.recordInfoSocket.emit).toHaveBeenCalledTimes(1);
            expect(fakes.storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("saves the local backend when commit reports local", async () => {
            // given
            fakes.storageService.commit.mockResolvedValue("local");

            // when
            const [saved] = await service.processUpload(uploadProps());

            // then
            expect(saved.storageBackend).toBe("local");
        });

        it("returns a live duplicate from the same ip without committing", async () => {
            // given
            const existing = existingEntry({ ip: "1.1.1.1" });
            fakes.repo.getEntriesFromChecksum.mockResolvedValue([existing]);

            // when
            const result = await service.processUpload(uploadProps());

            // then
            expect(result).toEqual([existing, true]);
            expect(fakes.repo.getEntriesFromChecksum).toHaveBeenCalledWith(checksum, undefined);
            expect(fakes.storageService.commit).not.toHaveBeenCalled();
            expect(fakes.repo.saveEntry).not.toHaveBeenCalled();
            expect(fakes.storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("returns a live duplicate in the same bucket regardless of ip without committing", async () => {
            // given
            const existing = existingEntry({ ip: "9.9.9.9", bucketToken: "bucket-1" });
            fakes.repo.getEntriesFromChecksum.mockResolvedValue([existing]);

            // when
            const result = await service.processUpload(uploadProps({ bucketToken: "bucket-1" }));

            // then
            expect(result).toEqual([existing, true]);
            expect(fakes.repo.getEntriesFromChecksum).toHaveBeenCalledWith(checksum, "bucket-1");
            expect(fakes.storageService.commit).not.toHaveBeenCalled();
            expect(fakes.storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("does not treat the same checksum from a different ip as a duplicate", async () => {
            // given
            fakes.repo.getEntriesFromChecksum.mockResolvedValue([existingEntry({ ip: "9.9.9.9" })]);

            // when
            const [, duplicate] = await service.processUpload(uploadProps());

            // then
            expect(duplicate).toBe(false);
            expect(fakes.storageService.commit).toHaveBeenCalledTimes(1);
        });

        it("deletes an expired duplicate and then uploads a new entry", async () => {
            // given
            const expired = existingEntry({ expires: Date.now() - 1000 });
            fakes.repo.getEntriesFromChecksum.mockResolvedValue([expired]);

            // when
            const [saved, duplicate] = await service.processUpload(uploadProps());

            // then
            expect(fakes.fileService.processDelete).toHaveBeenCalledWith(["existing-token"]);
            expect(duplicate).toBe(false);
            expect(saved.token).not.toBe("existing-token");
            expect(fakes.storageService.commit).toHaveBeenCalledTimes(1);
            expect(fakes.fileService.processDelete.mock.invocationCallOrder[0]).toBeLessThan(
                fakes.storageService.commit.mock.invocationCallOrder[0],
            );
        });

        it("throws the highest priority filter error and never commits", async () => {
            // given
            const lowError = new BadRequest("low");
            const highError = new Forbidden("high");
            const failed = [
                { priority: 1, error: lowError },
                { priority: 5, error: highError },
                { priority: 3, error: new BadRequest("mid") },
            ] as unknown as IFileFilter[];
            fakes.fileFilterManager.process.mockResolvedValue(failed);

            // when
            const result = service.processUpload(uploadProps());

            // then
            await expect(result).rejects.toBe(highError);
            expect(fakes.fileFilterManager.process).toHaveBeenCalledWith(stagedPath, "picture.txt");
            expect(fakes.storageService.commit).not.toHaveBeenCalled();
            expect(fakes.repo.saveEntry).not.toHaveBeenCalled();
            expect(fakes.storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("encrypts the staged file before commit when a password is supplied and encryption is enabled", async () => {
            // given
            fakes.encryptionService.encryptFile.mockResolvedValue(true);

            // when
            const [saved] = await service.processUpload(uploadProps({ password: "hunter2" }));

            // then
            expect(fakes.encryptionService.encryptFile).toHaveBeenCalledWith(stagedPath, "hunter2");
            expect(fakes.encryptionService.encryptFile.mock.invocationCallOrder[0]).toBeLessThan(
                fakes.storageService.commit.mock.invocationCallOrder[0],
            );
            expect(saved.encrypted).toBe(true);
            expect(saved.settings?.password).toBeTypeOf("string");
            expect(saved.settings?.password).not.toBe("hunter2");
        });

        it("stores the file unencrypted when a password is supplied but no SALT is configured", async () => {
            // given
            fakes.encryptionService.encryptFile.mockResolvedValue(false);

            // when
            const [saved] = await service.processUpload(uploadProps({ password: "hunter2" }));

            // then
            expect(fakes.storageService.commit).toHaveBeenCalledTimes(1);
            expect(saved.encrypted).toBe(false);
            expect(saved.settings?.password).toBeTypeOf("string");
        });

        it("does not call encryption when no password is supplied", async () => {
            // when
            const [saved] = await service.processUpload(uploadProps());

            // then
            expect(fakes.encryptionService.encryptFile).not.toHaveBeenCalled();
            expect(saved.settings).toBeNull();
        });

        it("wraps an encryption failure in InternalServerError, never commits and removes the staged file", async () => {
            // given
            fakes.encryptionService.encryptFile.mockRejectedValue(new Error("cipher broke"));

            // when
            const result = service.processUpload(uploadProps({ password: "hunter2" }));

            // then
            await expect(result).rejects.toBeInstanceOf(InternalServerError);
            await expect(result).rejects.toThrow("cipher broke");
            expect(fakes.logger.error).toHaveBeenCalledWith("cipher broke");
            expect(fakes.storageService.commit).not.toHaveBeenCalled();
            expect(fakes.storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("rejects an unknown bucket, never commits and removes the staged file", async () => {
            // given
            fakes.bucketService.bucketExists.mockResolvedValue(false);

            // when
            const result = service.processUpload(uploadProps({ bucketToken: "missing-bucket" }));

            // then
            await expect(result).rejects.toBeInstanceOf(BadRequest);
            expect(fakes.storageService.commit).not.toHaveBeenCalled();
            expect(fakes.storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("removes the staged file when commit throws", async () => {
            // given
            const commitError = new Error("s3 down");
            fakes.storageService.commit.mockRejectedValue(commitError);

            // when
            const result = service.processUpload(uploadProps());

            // then
            await expect(result).rejects.toBe(commitError);
            expect(fakes.repo.saveEntry).not.toHaveBeenCalled();
            expect(fakes.storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("deletes the committed object and rethrows when saving the entry fails", async () => {
            // given
            const saveError = new Error("db locked");
            fakes.repo.saveEntry.mockRejectedValue(saveError);

            // when
            const result = service.processUpload(uploadProps());

            // then
            await expect(result).rejects.toBe(saveError);
            expect(fakes.storageService.delete).toHaveBeenCalledTimes(1);
            const [deleted] = fakes.storageService.delete.mock.calls[0] as [FileUploadModel[]];
            expect(deleted).toHaveLength(1);
            expect(deleted[0].fileName).toBe("staged-name");
            expect(deleted[0].storageBackend).toBe("s3");
            expect(fakes.recordInfoSocket.emit).not.toHaveBeenCalled();
            expect(fakes.storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("rethrows the original save error even when the compensating delete also fails", async () => {
            // given
            const saveError = new Error("db locked");
            fakes.repo.saveEntry.mockRejectedValue(saveError);
            fakes.storageService.delete.mockRejectedValue(new Error("s3 delete failed"));

            // when
            const result = service.processUpload(uploadProps());

            // then
            await expect(result).rejects.toBe(saveError);
            expect(fakes.logger.error).toHaveBeenCalledWith(expect.stringContaining("s3 delete failed"));
            expect(fakes.storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("uses the staged path and file name returned by FileUrlService for a URL source", async () => {
            // given
            fakes.fileUrlService.getFile.mockResolvedValue([stagedPath, "/from-url.png"]);

            // when
            const [saved] = await service.processUpload(uploadProps({ source: "https://example.com/from-url.png" }));

            // then
            expect(fakes.fileUrlService.getFile).toHaveBeenCalledWith("https://example.com/from-url.png");
            expect(fakes.storageService.commit).toHaveBeenCalledWith(stagedPath, expect.any(FileUploadModel));
            expect(saved.originalFileName).toBe("from-url.png");
            expect(saved.fileExtension).toBe("png");
            expect(fakes.storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });
    });

    describe("modifyEntry", () => {
        it("encrypts an unencrypted entry through the encryption service when a password is added", async () => {
            // given
            const entry = existingEntry({ encrypted: false });
            fakes.repo.getEntries.mockResolvedValue([entry]);
            fakes.encryptionService.encryptEntry.mockResolvedValue(true);

            // when
            const saved = await service.modifyEntry("existing-token", { password: "newpass" });

            // then
            expect(fakes.encryptionService.encryptEntry).toHaveBeenCalledWith(entry, "newpass");
            expect(saved.encrypted).toBe(true);
            expect(saved.settings?.password).toBeTypeOf("string");
            expect(saved.settings?.password).not.toBe("newpass");
        });

        it("leaves the entry unencrypted when adding a password but encryption is disabled", async () => {
            // given
            fakes.repo.getEntries.mockResolvedValue([existingEntry({ encrypted: false })]);
            fakes.encryptionService.encryptEntry.mockResolvedValue(false);

            // when
            const saved = await service.modifyEntry("existing-token", { password: "newpass" });

            // then
            expect(saved.encrypted).toBe(false);
            expect(saved.settings?.password).toBeTypeOf("string");
        });

        it("writes decrypted bytes through the storage service when the password is removed", async () => {
            // given
            const entry = existingEntry({ encrypted: true, settings: { password: "hashed" } });
            const decrypted = Buffer.from("plain bytes");
            fakes.repo.getEntries.mockResolvedValue([entry]);
            fakes.encryptionService.decrypt.mockResolvedValue(decrypted);

            // when
            const saved = await service.modifyEntry("existing-token", { password: "", previousPassword: "oldpass" });

            // then
            expect(fakes.encryptionService.decrypt).toHaveBeenCalledWith(entry, "oldpass");
            expect(fakes.storageService.write).toHaveBeenCalledWith(entry, decrypted);
            expect(saved.encrypted).toBe(false);
            expect(saved.settings?.password).toBeUndefined();
        });

        it("refuses to remove a password from an encrypted entry without the previous password", async () => {
            // given
            fakes.repo.getEntries.mockResolvedValue([
                existingEntry({ encrypted: true, settings: { password: "hashed" } }),
            ]);

            // when
            const result = service.modifyEntry("existing-token", { password: "" });

            // then
            await expect(result).rejects.toBeInstanceOf(BadRequest);
            expect(fakes.storageService.write).not.toHaveBeenCalled();
            expect(fakes.repo.saveEntry).not.toHaveBeenCalled();
        });

        it("recalculates expiry from the entry file size when customExpiry is empty", async () => {
            // given
            const createdAt = new Date("2026-01-01T00:00:00Z");
            const entry = existingEntry({ fileSize: 5 * 1048576, createdAt, expires: 1 });
            fakes.repo.getEntries.mockResolvedValue([entry]);

            // when
            const saved = await service.modifyEntry("existing-token", { customExpiry: "" });

            // then
            expect(saved.expires).toBe(FileUtils.getExpiresBySize(5 * 1048576, maxFileSize, createdAt.getTime()));
        });

        it("rejects an unknown token", async () => {
            // given
            fakes.repo.getEntries.mockResolvedValue([]);

            // when
            const result = service.modifyEntry("nope", { hideFilename: true });

            // then
            await expect(result).rejects.toBeInstanceOf(BadRequest);
        });
    });
});
