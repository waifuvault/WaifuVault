import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import argon2 from "argon2";
import { Forbidden } from "@tsed/exceptions";
import { GlobalEnv } from "../../model/constants/GlobalEnv.js";
import type { FileUploadModel } from "../../model/db/FileUpload.model.js";
import type { SettingsService } from "../SettingsService.js";
import type { StorageService } from "../StorageService.js";
import { EncryptionService } from "../EncryptionService.js";

const validSalt = "abcdefgh";

const plaintext = Buffer.from("waifu vault secret bytes");

type FakeStorage = {
    readAll: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
};

function createSettings(salt: string | null): SettingsService {
    return {
        getSetting: (key: GlobalEnv): string | null => (key === GlobalEnv.SALT ? salt : null),
    } as unknown as SettingsService;
}

function createStorage(initial: Buffer = Buffer.alloc(0)): FakeStorage {
    let stored = initial;
    return {
        readAll: vi.fn(() => Promise.resolve(stored)),
        write: vi.fn((_entry: FileUploadModel, data: Buffer) => {
            stored = data;
            return Promise.resolve();
        }),
    };
}

function createService(salt: string | null, storage: FakeStorage): EncryptionService {
    return new EncryptionService(createSettings(salt), storage as unknown as StorageService);
}

async function createEntry(password: string): Promise<FileUploadModel> {
    return {
        fileOnDisk: "file.bin",
        settings: { password: await argon2.hash(password) },
    } as unknown as FileUploadModel;
}

describe("EncryptionService", () => {
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wv-encryption-"));
    });

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it("returns false from encryptFile without a salt and never reads the file", async () => {
        // given
        const storage = createStorage();
        const service = createService(null, storage);
        const missingPath = path.join(tmpDir, "does-not-exist.bin");

        // when
        const result = await service.encryptFile(missingPath, "pw");

        // then
        expect(result).toBe(false);
        await expect(fs.access(missingPath)).rejects.toThrow();
    });

    it("returns false from encryptEntry without a salt and never touches storage", async () => {
        // given
        const storage = createStorage(plaintext);
        const service = createService(null, storage);
        const entry = await createEntry("pw");

        // when
        const result = await service.encryptEntry(entry, "pw");

        // then
        expect(result).toBe(false);
        expect(storage.readAll).not.toHaveBeenCalled();
        expect(storage.write).not.toHaveBeenCalled();
    });

    it("rewrites a local file as a 16 byte IV plus ciphertext that decrypts back to the original", async () => {
        // given
        const filePath = path.join(tmpDir, "file.bin");
        await fs.writeFile(filePath, plaintext);
        const storage = createStorage();
        const service = createService(validSalt, storage);
        const entry = await createEntry("pw");

        // when
        const result = await service.encryptFile(filePath, "pw");
        const onDisk = await fs.readFile(filePath);
        storage.readAll.mockResolvedValue(onDisk);
        const decrypted = await service.decryptVerified(entry, "pw");

        // then
        expect(result).toBe(true);
        expect(onDisk.length).toBe(16 + plaintext.length);
        expect(onDisk.subarray(16).equals(plaintext)).toBe(false);
        expect(storage.readAll).toHaveBeenCalledWith(entry);
        expect(decrypted.equals(plaintext)).toBe(true);
    });

    it("encrypts an entry through storage and writes the encrypted bytes back", async () => {
        // given
        const storage = createStorage(plaintext);
        const service = createService(validSalt, storage);
        const entry = await createEntry("pw");

        // when
        const result = await service.encryptEntry(entry, "pw");

        // then
        expect(result).toBe(true);
        expect(storage.readAll).toHaveBeenCalledWith(entry);
        expect(storage.write).toHaveBeenCalledTimes(1);
        const [writtenEntry, written] = storage.write.mock.calls[0] as [FileUploadModel, Buffer];
        expect(writtenEntry).toBe(entry);
        expect(written.length).toBe(16 + plaintext.length);
        expect(written.equals(plaintext)).toBe(false);
        expect((await service.decryptVerified(entry, "pw")).equals(plaintext)).toBe(true);
    });

    it("changes the password so the stored bytes decrypt with the new one", async () => {
        // given
        const storage = createStorage(plaintext);
        const service = createService(validSalt, storage);
        const entry = await createEntry("old-pw");
        await service.encryptEntry(entry, "old-pw");
        storage.write.mockClear();

        // when
        await service.changePassword("old-pw", "new-pw", entry);

        // then
        expect(storage.write).toHaveBeenCalledTimes(1);
        expect(storage.write.mock.calls[0]?.[0]).toBe(entry);
        expect((await service.decryptVerified(entry, "new-pw")).equals(plaintext)).toBe(true);
        expect((await service.decryptVerified(entry, "old-pw")).equals(plaintext)).toBe(false);
    });

    it("throws Forbidden when decrypting with the wrong password", async () => {
        // given
        const storage = createStorage(plaintext);
        const service = createService(validSalt, storage);
        const entry = await createEntry("right-pw");
        await service.encryptEntry(entry, "right-pw");
        storage.readAll.mockClear();

        // when
        const attempt = service.decrypt(entry, "wrong-pw");

        // then
        await expect(attempt).rejects.toBeInstanceOf(Forbidden);
        expect(storage.readAll).not.toHaveBeenCalled();
    });

    it("decrypts with the correct password", async () => {
        // given
        const storage = createStorage(plaintext);
        const service = createService(validSalt, storage);
        const entry = await createEntry("right-pw");
        await service.encryptEntry(entry, "right-pw");

        // when
        const decrypted = await service.decrypt(entry, "right-pw");

        // then
        expect(decrypted.equals(plaintext)).toBe(true);
    });

    it("rejects a salt that is not 8 characters on init", () => {
        // given
        const service = createService("short", createStorage());

        // when
        let error: unknown = null;
        try {
            service.$onInit();
        } catch (e) {
            error = e;
        }

        // then
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Salt must be 8 characters");
    });

    it("accepts an 8 character salt or no salt on init", () => {
        // given
        const services = [createService(validSalt, createStorage()), createService(null, createStorage())];

        // when
        const errors: unknown[] = [];
        for (const service of services) {
            try {
                service.$onInit();
            } catch (e) {
                errors.push(e);
            }
        }

        // then
        expect(errors).toEqual([]);
    });
});
