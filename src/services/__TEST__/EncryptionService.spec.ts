import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import argon2 from "argon2";
import { PlatformTest } from "@tsed/platform-http/testing";
import { Forbidden } from "@tsed/exceptions";
import { GlobalEnv } from "../../model/constants/GlobalEnv.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { SettingsService } from "../SettingsService.js";
import { StorageService } from "../StorageService.js";
import { EncryptionService } from "../EncryptionService.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";

vi.mock("../../db/DataSource.js", () => ({ dataSource: {} }));

const validSalt = "abcdefgh";

const plaintext = Buffer.from("waifu vault secret bytes");

async function makeEntry(password: string): Promise<FileUploadModel> {
    return Object.assign(new FileUploadModel(), {
        token: "token-1",
        fileName: "file",
        fileExtension: "bin",
        settings: { password: await argon2.hash(password) },
        storageBackend: "local",
    });
}

describe("EncryptionService", () => {
    const settingsService = { getSetting: vi.fn() };
    const storageService = { readAll: vi.fn(), write: vi.fn() };
    let stored: Buffer;
    let tmpDir: string;

    function createService(salt: string | null): Promise<EncryptionService> {
        settingsService.getSetting.mockImplementation((key: GlobalEnv) => (key === GlobalEnv.SALT ? salt : null));

        return PlatformTest.invoke<EncryptionService>(EncryptionService, [
            { token: SettingsService, use: settingsService },
            { token: StorageService, use: storageService },
        ]);
    }

    beforeEach(async () => {
        await PlatformTest.create({
            imports: [{ token: SQLITE_DATA_SOURCE, use: { getRepository: vi.fn() } }],
        });
        vi.resetAllMocks();
        stored = plaintext;
        storageService.readAll.mockImplementation(() => Promise.resolve(stored));
        storageService.write.mockImplementation((_entry: FileUploadModel, data: Buffer) => {
            stored = data;
            return Promise.resolve();
        });

        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wv-encryption-"));
    });

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
        await PlatformTest.reset();
    });

    it("returns false from encryptFile without a salt and never reads the file", async () => {
        // given
        const service = await createService(null);
        const missingPath = path.join(tmpDir, "does-not-exist.bin");

        // when
        const result = await service.encryptFile(missingPath, "pw");

        // then
        expect(result).toBe(false);
        await expect(fs.access(missingPath)).rejects.toThrow();
    });

    it("returns false from encryptEntry without a salt and never touches storage", async () => {
        // given
        const service = await createService(null);
        const entry = await makeEntry("pw");

        // when
        const result = await service.encryptEntry(entry, "pw");

        // then
        expect(result).toBe(false);
        expect(storageService.readAll).not.toHaveBeenCalled();
        expect(storageService.write).not.toHaveBeenCalled();
    });

    it("rewrites a local file as a 16 byte IV plus ciphertext that decrypts back to the original", async () => {
        // given
        const filePath = path.join(tmpDir, "file.bin");
        await fs.writeFile(filePath, plaintext);
        const service = await createService(validSalt);
        const entry = await makeEntry("pw");

        // when
        const result = await service.encryptFile(filePath, "pw");
        const onDisk = await fs.readFile(filePath);
        stored = onDisk;
        const decrypted = await service.decryptVerified(entry, "pw");

        // then
        expect(result).toBe(true);
        expect(onDisk.length).toBe(16 + plaintext.length);
        expect(onDisk.subarray(16).equals(plaintext)).toBe(false);
        expect(storageService.readAll).toHaveBeenCalledWith(entry);
        expect(decrypted.equals(plaintext)).toBe(true);
    });

    it("encrypts an entry through storage and writes the encrypted bytes back", async () => {
        // given
        const service = await createService(validSalt);
        const entry = await makeEntry("pw");

        // when
        const result = await service.encryptEntry(entry, "pw");

        // then
        expect(result).toBe(true);
        expect(storageService.readAll).toHaveBeenCalledWith(entry);
        expect(storageService.write).toHaveBeenCalledOnce();
        const [writtenEntry, written] = storageService.write.mock.calls[0];
        expect(writtenEntry).toBe(entry);
        expect(written.length).toBe(16 + plaintext.length);
        expect(written.equals(plaintext)).toBe(false);
        expect((await service.decryptVerified(entry, "pw")).equals(plaintext)).toBe(true);
    });

    it("changes the password so the stored bytes decrypt with the new one", async () => {
        // given
        const service = await createService(validSalt);
        const entry = await makeEntry("old-pw");
        await service.encryptEntry(entry, "old-pw");
        storageService.write.mockClear();

        // when
        await service.changePassword("old-pw", "new-pw", entry);

        // then
        expect(storageService.write).toHaveBeenCalledOnce();
        expect(storageService.write.mock.calls[0][0]).toBe(entry);
        expect((await service.decryptVerified(entry, "new-pw")).equals(plaintext)).toBe(true);
        expect((await service.decryptVerified(entry, "old-pw")).equals(plaintext)).toBe(false);
    });

    it("throws Forbidden when decrypting with the wrong password", async () => {
        // given
        const service = await createService(validSalt);
        const entry = await makeEntry("right-pw");
        await service.encryptEntry(entry, "right-pw");
        storageService.readAll.mockClear();

        // when
        const attempt = service.decrypt(entry, "wrong-pw");

        // then
        await expect(attempt).rejects.toBeInstanceOf(Forbidden);
        expect(storageService.readAll).not.toHaveBeenCalled();
    });

    it("decrypts with the correct password", async () => {
        // given
        const service = await createService(validSalt);
        const entry = await makeEntry("right-pw");
        await service.encryptEntry(entry, "right-pw");

        // when
        const decrypted = await service.decrypt(entry, "right-pw");

        // then
        expect(decrypted.equals(plaintext)).toBe(true);
    });

    it("rejects a salt that is not 8 characters on init", async () => {
        // given
        const salt = "short";

        // when
        const result = createService(salt);

        // then
        await expect(result).rejects.toThrow(new Error("Salt must be 8 characters"));
    });

    it("accepts an 8 character salt or no salt on init", async () => {
        // given
        const salts = [validSalt, null];

        // when
        const services: EncryptionService[] = [];
        for (const salt of salts) {
            services.push(await createService(salt));
        }

        // then
        expect(services).toHaveLength(2);
        for (const service of services) {
            expect(service).toBeInstanceOf(EncryptionService);
        }
    });
});
