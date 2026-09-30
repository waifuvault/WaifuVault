import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { PlatformTest } from "@tsed/platform-http/testing";
import { Logger } from "@tsed/logger";
import type { PlatformMulterFile } from "@tsed/platform-multer";
import { BadRequest, InternalServerError, UnprocessableEntity } from "@tsed/exceptions";
import { FileUploadService } from "../FileUploadService.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { FileUtils } from "../../utils/Utils.js";
import { FileRepo } from "../../db/repo/FileRepo.js";
import { FileUrlService } from "../FileUrlService.js";
import { MimeService } from "../MimeService.js";
import { EncryptionService } from "../EncryptionService.js";
import { RecordInfoSocket } from "../socket/RecordInfoSocket.js";
import { FileService } from "../FileService.js";
import { BucketService } from "../BucketService.js";
import { FileFilterManager } from "../../manager/FileFilterManager.js";
import { FileReputationService } from "../FileReputationService.js";
import { StorageService } from "../StorageService.js";
import { SettingsService } from "../SettingsService.js";
import { UserAdminService } from "../UserAdminService.js";
import { AvManager } from "../../manager/AvManager.js";
import { AvFilter } from "../../engine/impl/fileFilters/AvFilter.js";
import { MimeFilter } from "../../engine/impl/fileFilters/MimeFilter.js";
import { FileRejectionFilter } from "../../engine/impl/fileFilters/FileRejectionFilter.js";
import { EntryModificationDto } from "../../model/dto/EntryModificationDto.js";
import type { FileUploadProps } from "../../utils/typeings.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";

vi.mock("../../db/DataSource.js", () => ({ dataSource: {} }));

const maxFileSize = 100 * 1048576;

const fileContents = "hello waifuvault";

function existingEntry(overrides: Partial<FileUploadModel>): FileUploadModel {
    return Object.assign(new FileUploadModel(), {
        token: "existing-token",
        ip: "1.1.1.1",
        fileName: "existing",
        fileExtension: "txt",
        originalFileName: "existing.txt",
        fileSize: 10,
        expires: Date.now() + 60_000,
        encrypted: false,
        settings: null,
        storageBackend: "local",
        createdAt: new Date(),
        ...overrides,
    });
}

function modification(values: Partial<EntryModificationDto>): EntryModificationDto {
    return Object.assign(new EntryModificationDto(), values);
}

describe("FileUploadService", () => {
    const repo = { getEntriesFromChecksum: vi.fn(), saveEntry: vi.fn(), getEntries: vi.fn() };
    const fileUrlService = { getFile: vi.fn() };
    const mimeService = { findMimeType: vi.fn(), isBlocked: vi.fn() };
    const logger = { error: vi.fn(), warn: vi.fn() };
    const encryptionService = {
        encryptFile: vi.fn(),
        encryptEntry: vi.fn(),
        decrypt: vi.fn(),
        changePassword: vi.fn(),
    };
    const recordInfoSocket = { emit: vi.fn() };
    const fileService = { processDelete: vi.fn() };
    const bucketService = { bucketExists: vi.fn(), getBucket: vi.fn() };
    const fileFilterManager = { process: vi.fn() };
    const fileReputationService = { enqueueFile: vi.fn() };
    const storageService = { commit: vi.fn(), removeStaged: vi.fn(), delete: vi.fn(), write: vi.fn() };
    const settingsService = { getSetting: vi.fn(), getMaxFileSize: vi.fn() };
    const avManager = { scanFile: vi.fn() };
    const userAdminService = { blockIp: vi.fn() };
    let tempDir: string;
    let stagedPath: string;
    let checksum: string;
    let service: FileUploadService;

    function multerSource(): PlatformMulterFile {
        return {
            fieldname: "file",
            originalname: "picture.txt",
            encoding: "7bit",
            mimetype: "text/plain",
            size: fileContents.length,
            stream: Readable.from([]),
            destination: tempDir,
            filename: "staged-name",
            path: stagedPath,
            buffer: Buffer.alloc(0),
        };
    }

    function uploadProps(overrides: Partial<FileUploadProps> = {}): FileUploadProps {
        return {
            ip: "1.1.1.1",
            source: multerSource(),
            options: {},
            ...overrides,
        };
    }

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fileuploadservice-"));
        stagedPath = path.join(tempDir, "staged-name");
        await fs.writeFile(stagedPath, fileContents);
        checksum = crypto.createHash("md5").update(fileContents).digest("hex");

        await PlatformTest.create({
            imports: [{ token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } }],
        });
        vi.resetAllMocks();
        repo.getEntriesFromChecksum.mockResolvedValue([]);
        repo.saveEntry.mockImplementation((entry: FileUploadModel) => Promise.resolve(entry));
        repo.getEntries.mockResolvedValue([]);
        mimeService.findMimeType.mockResolvedValue("text/plain");
        encryptionService.encryptFile.mockResolvedValue(true);
        encryptionService.encryptEntry.mockResolvedValue(true);
        encryptionService.changePassword.mockResolvedValue(undefined);
        fileService.processDelete.mockResolvedValue(true);
        bucketService.bucketExists.mockResolvedValue(true);
        bucketService.getBucket.mockResolvedValue(null);
        fileFilterManager.process.mockResolvedValue([]);
        storageService.commit.mockResolvedValue("s3");
        storageService.removeStaged.mockResolvedValue(undefined);
        storageService.delete.mockResolvedValue(undefined);
        storageService.write.mockResolvedValue(undefined);
        settingsService.getSetting.mockReturnValue(null);
        settingsService.getMaxFileSize.mockReturnValue(maxFileSize);

        service = await PlatformTest.invoke<FileUploadService>(FileUploadService, [
            { token: FileRepo, use: repo },
            { token: FileUrlService, use: fileUrlService },
            { token: MimeService, use: mimeService },
            { token: Logger, use: logger },
            { token: EncryptionService, use: encryptionService },
            { token: RecordInfoSocket, use: recordInfoSocket },
            { token: FileService, use: fileService },
            { token: BucketService, use: bucketService },
            { token: FileFilterManager, use: fileFilterManager },
            { token: FileReputationService, use: fileReputationService },
            { token: StorageService, use: storageService },
            { token: SettingsService, use: settingsService },
        ]);
    });

    afterEach(async () => {
        await PlatformTest.reset();
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe("processUpload", () => {
        it("commits the staged multer file and saves the backend returned by commit", async () => {
            // given
            storageService.commit.mockResolvedValue("s3");

            // when
            const [saved, duplicate] = await service.processUpload(uploadProps());

            // then
            expect(duplicate).toBe(false);
            expect(storageService.commit).toHaveBeenCalledExactlyOnceWith(
                stagedPath,
                expect.objectContaining({
                    fileName: "staged-name",
                    fileExtension: "txt",
                    originalFileName: "picture.txt",
                    checksum,
                    fileSize: fileContents.length,
                }),
            );
            expect(repo.saveEntry).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ storageBackend: "s3" }));
            expect(saved).toBeInstanceOf(FileUploadModel);
            expect(saved.storageBackend).toBe("s3");
            expect(recordInfoSocket.emit).toHaveBeenCalledOnce();
            expect(storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("saves the local backend when commit reports local", async () => {
            // given
            storageService.commit.mockResolvedValue("local");

            // when
            const [saved] = await service.processUpload(uploadProps());

            // then
            expect(saved.storageBackend).toBe("local");
        });

        it("returns a live duplicate from the same ip without committing", async () => {
            // given
            const existing = existingEntry({ ip: "1.1.1.1" });
            repo.getEntriesFromChecksum.mockResolvedValue([existing]);

            // when
            const result = await service.processUpload(uploadProps());

            // then
            expect(result).toEqual([existing, true]);
            expect(repo.getEntriesFromChecksum).toHaveBeenCalledWith(checksum, undefined);
            expect(storageService.commit).not.toHaveBeenCalled();
            expect(repo.saveEntry).not.toHaveBeenCalled();
            expect(storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("returns a live duplicate in the same bucket regardless of ip without committing", async () => {
            // given
            const existing = existingEntry({ ip: "9.9.9.9", bucketToken: "bucket-1" });
            repo.getEntriesFromChecksum.mockResolvedValue([existing]);

            // when
            const result = await service.processUpload(uploadProps({ bucketToken: "bucket-1" }));

            // then
            expect(result).toEqual([existing, true]);
            expect(repo.getEntriesFromChecksum).toHaveBeenCalledWith(checksum, "bucket-1");
            expect(storageService.commit).not.toHaveBeenCalled();
            expect(storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("does not treat the same checksum from a different ip as a duplicate", async () => {
            // given
            repo.getEntriesFromChecksum.mockResolvedValue([existingEntry({ ip: "9.9.9.9" })]);

            // when
            const [, duplicate] = await service.processUpload(uploadProps());

            // then
            expect(duplicate).toBe(false);
            expect(storageService.commit).toHaveBeenCalledOnce();
        });

        it("deletes an expired duplicate and then uploads a new entry", async () => {
            // given
            const expired = existingEntry({ expires: Date.now() - 1000 });
            repo.getEntriesFromChecksum.mockResolvedValue([expired]);

            // when
            const [saved, duplicate] = await service.processUpload(uploadProps());

            // then
            expect(fileService.processDelete).toHaveBeenCalledWith(["existing-token"]);
            expect(duplicate).toBe(false);
            expect(saved.token).not.toBe("existing-token");
            expect(storageService.commit).toHaveBeenCalledOnce();
            expect(fileService.processDelete.mock.invocationCallOrder[0]).toBeLessThan(
                storageService.commit.mock.invocationCallOrder[0],
            );
        });

        it("throws the highest priority filter error and never commits", async () => {
            // given
            const avFilter = await PlatformTest.invoke<AvFilter>(AvFilter, [
                { token: AvManager, use: avManager },
                { token: Logger, use: logger },
            ]);
            const rejectionFilter = await PlatformTest.invoke<FileRejectionFilter>(FileRejectionFilter, [
                { token: Logger, use: logger },
                { token: SettingsService, use: settingsService },
                { token: UserAdminService, use: userAdminService },
            ]);
            const mimeFilter = await PlatformTest.invoke<MimeFilter>(MimeFilter, [
                { token: MimeService, use: mimeService },
                { token: Logger, use: logger },
            ]);
            fileFilterManager.process.mockResolvedValue([avFilter, rejectionFilter, mimeFilter]);

            // when
            const result = service.processUpload(uploadProps());

            // then
            await expect(result).rejects.toThrow(new UnprocessableEntity("File Not Accepted"));
            expect(fileFilterManager.process).toHaveBeenCalledWith(stagedPath, "picture.txt");
            expect(storageService.commit).not.toHaveBeenCalled();
            expect(repo.saveEntry).not.toHaveBeenCalled();
            expect(storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("encrypts the staged file before commit when a password is supplied and encryption is enabled", async () => {
            // given
            encryptionService.encryptFile.mockResolvedValue(true);

            // when
            const [saved] = await service.processUpload(uploadProps({ password: "hunter2" }));

            // then
            expect(encryptionService.encryptFile).toHaveBeenCalledWith(stagedPath, "hunter2");
            expect(encryptionService.encryptFile.mock.invocationCallOrder[0]).toBeLessThan(
                storageService.commit.mock.invocationCallOrder[0],
            );
            expect(saved.encrypted).toBe(true);
            expect(saved.settings?.password).toBeTypeOf("string");
            expect(saved.settings?.password).not.toBe("hunter2");
        });

        it("stores the file unencrypted when a password is supplied but no SALT is configured", async () => {
            // given
            encryptionService.encryptFile.mockResolvedValue(false);

            // when
            const [saved] = await service.processUpload(uploadProps({ password: "hunter2" }));

            // then
            expect(storageService.commit).toHaveBeenCalledOnce();
            expect(saved.encrypted).toBe(false);
            expect(saved.settings?.password).toBeTypeOf("string");
        });

        it("does not call encryption when no password is supplied", async () => {
            // when
            const [saved] = await service.processUpload(uploadProps());

            // then
            expect(encryptionService.encryptFile).not.toHaveBeenCalled();
            expect(saved.settings).toBeNull();
        });

        it("wraps an encryption failure in InternalServerError, never commits and removes the staged file", async () => {
            // given
            encryptionService.encryptFile.mockRejectedValue(new Error("cipher broke"));

            // when
            const result = service.processUpload(uploadProps({ password: "hunter2" }));

            // then
            await expect(result).rejects.toBeInstanceOf(InternalServerError);
            await expect(result).rejects.toThrow("cipher broke");
            expect(logger.error).toHaveBeenCalledWith("cipher broke");
            expect(storageService.commit).not.toHaveBeenCalled();
            expect(storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("rejects an unknown bucket, never commits and removes the staged file", async () => {
            // given
            bucketService.bucketExists.mockResolvedValue(false);

            // when
            const result = service.processUpload(uploadProps({ bucketToken: "missing-bucket" }));

            // then
            await expect(result).rejects.toBeInstanceOf(BadRequest);
            expect(storageService.commit).not.toHaveBeenCalled();
            expect(storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("removes the staged file when commit throws", async () => {
            // given
            const commitError = new Error("s3 down");
            storageService.commit.mockRejectedValue(commitError);

            // when
            const result = service.processUpload(uploadProps());

            // then
            await expect(result).rejects.toBe(commitError);
            expect(repo.saveEntry).not.toHaveBeenCalled();
            expect(storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("deletes the committed object and rethrows when saving the entry fails", async () => {
            // given
            const saveError = new Error("db locked");
            repo.saveEntry.mockRejectedValue(saveError);

            // when
            const result = service.processUpload(uploadProps());

            // then
            await expect(result).rejects.toBe(saveError);
            expect(storageService.delete).toHaveBeenCalledExactlyOnceWith([
                expect.objectContaining({ fileName: "staged-name", storageBackend: "s3" }),
            ]);
            expect(recordInfoSocket.emit).not.toHaveBeenCalled();
            expect(storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("rethrows the original save error even when the compensating delete also fails", async () => {
            // given
            const saveError = new Error("db locked");
            repo.saveEntry.mockRejectedValue(saveError);
            storageService.delete.mockRejectedValue(new Error("s3 delete failed"));

            // when
            const result = service.processUpload(uploadProps());

            // then
            await expect(result).rejects.toBe(saveError);
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("s3 delete failed"));
            expect(storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });

        it("uses the staged path and file name returned by FileUrlService for a URL source", async () => {
            // given
            fileUrlService.getFile.mockResolvedValue([stagedPath, "/from-url.png"]);

            // when
            const [saved] = await service.processUpload(uploadProps({ source: "https://example.com/from-url.png" }));

            // then
            expect(fileUrlService.getFile).toHaveBeenCalledWith("https://example.com/from-url.png");
            expect(storageService.commit).toHaveBeenCalledWith(stagedPath, expect.any(FileUploadModel));
            expect(saved.originalFileName).toBe("from-url.png");
            expect(saved.fileExtension).toBe("png");
            expect(storageService.removeStaged).toHaveBeenCalledWith(stagedPath);
        });
    });

    describe("modifyEntry", () => {
        it("encrypts an unencrypted entry through the encryption service when a password is added", async () => {
            // given
            const entry = existingEntry({ encrypted: false });
            repo.getEntries.mockResolvedValue([entry]);
            encryptionService.encryptEntry.mockResolvedValue(true);

            // when
            const saved = await service.modifyEntry("existing-token", modification({ password: "newpass" }));

            // then
            expect(encryptionService.encryptEntry).toHaveBeenCalledWith(entry, "newpass");
            expect(saved.encrypted).toBe(true);
            expect(saved.settings?.password).toBeTypeOf("string");
            expect(saved.settings?.password).not.toBe("newpass");
        });

        it("leaves the entry unencrypted when adding a password but encryption is disabled", async () => {
            // given
            repo.getEntries.mockResolvedValue([existingEntry({ encrypted: false })]);
            encryptionService.encryptEntry.mockResolvedValue(false);

            // when
            const saved = await service.modifyEntry("existing-token", modification({ password: "newpass" }));

            // then
            expect(saved.encrypted).toBe(false);
            expect(saved.settings?.password).toBeTypeOf("string");
        });

        it("writes decrypted bytes through the storage service when the password is removed", async () => {
            // given
            const entry = existingEntry({ encrypted: true, settings: { password: "hashed" } });
            const decrypted = Buffer.from("plain bytes");
            repo.getEntries.mockResolvedValue([entry]);
            encryptionService.decrypt.mockResolvedValue(decrypted);

            // when
            const saved = await service.modifyEntry(
                "existing-token",
                modification({ password: "", previousPassword: "oldpass" }),
            );

            // then
            expect(encryptionService.decrypt).toHaveBeenCalledWith(entry, "oldpass");
            expect(storageService.write).toHaveBeenCalledWith(entry, decrypted);
            expect(saved.encrypted).toBe(false);
            expect(saved.settings?.password).toBeUndefined();
        });

        it("refuses to remove a password from an encrypted entry without the previous password", async () => {
            // given
            repo.getEntries.mockResolvedValue([existingEntry({ encrypted: true, settings: { password: "hashed" } })]);

            // when
            const result = service.modifyEntry("existing-token", modification({ password: "" }));

            // then
            await expect(result).rejects.toBeInstanceOf(BadRequest);
            expect(storageService.write).not.toHaveBeenCalled();
            expect(repo.saveEntry).not.toHaveBeenCalled();
        });

        it("recalculates expiry from the entry file size when customExpiry is empty", async () => {
            // given
            const createdAt = new Date("2026-01-01T00:00:00Z");
            repo.getEntries.mockResolvedValue([existingEntry({ fileSize: 5 * 1048576, createdAt, expires: 1 })]);

            // when
            const saved = await service.modifyEntry("existing-token", modification({ customExpiry: "" }));

            // then
            expect(saved.expires).toBe(FileUtils.getExpiresBySize(5 * 1048576, maxFileSize, createdAt.getTime()));
        });

        it("rejects an unknown token", async () => {
            // given
            repo.getEntries.mockResolvedValue([]);

            // when
            const result = service.modifyEntry("nope", modification({ hideFilename: true }));

            // then
            await expect(result).rejects.toBeInstanceOf(BadRequest);
        });
    });
});
