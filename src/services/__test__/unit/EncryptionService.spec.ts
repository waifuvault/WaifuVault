import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envs, initDotEnv } from "../../../__test__/testUtils.spec.js";
import { PlatformTest } from "@tsed/common";
import { EncryptionService } from "../../EncryptionService.js";
import { FileUtils } from "../../../utils/Utils.js";
import fs from "node:fs/promises";
import {
    fileUploadModelMock500MB,
    fileUploadModelMock500MBProtected,
} from "../../../model/db/__test__/mocks/FileUploadModel.mock.js";
import argon2 from "argon2";
import crypto from "node:crypto";

describe("unit tests", () => {
    beforeEach(() => {
        PlatformTest.create({
            envs,
        });
        initDotEnv();
    });

    afterEach(() => {
        vi.clearAllMocks();
        PlatformTest.reset();
    });

    vi.mock("node:fs/promises");

    vi.mock("argon2", async importOriginal => {
        return {
            ...(await importOriginal<typeof import("argon2")>()),
        };
    });

    vi.mock("node:crypto", async importOriginal => {
        const fakeIv = Buffer.from("hello");
        return {
            ...(await importOriginal<typeof import("node:crypto")>()),
            randomBytes: (size: number, callback: (err: Error | null, buf: Buffer) => void): void => {
                callback(null, fakeIv);
            },
        };
    });

    describe("encrypt", () => {
        it(
            "should encrypt a file",
            PlatformTest.inject([EncryptionService], async (encryptionService: EncryptionService) => {
                // given
                const fileToEnc = "fake.jpg";
                const encryptedBytes = Buffer.from("encryptedFake");
                const filePathSpy = vi.spyOn(FileUtils, "getFilePath").mockReturnValue(fileToEnc);
                const readFileMock = vi.mocked(fs.readFile).mockResolvedValue(Buffer.from(fileToEnc));
                const writeFileSpy = vi.mocked(fs.writeFile);
                vi.spyOn(Buffer, "concat").mockReturnValue(encryptedBytes);

                // when
                const result = await encryptionService.encrypt(fileToEnc, "foo");

                // then
                expect(filePathSpy).toBeCalledWith(fileToEnc);
                expect(readFileMock).toBeCalledWith(fileToEnc);
                expect(writeFileSpy).toBeCalledWith(fileToEnc, encryptedBytes);
                expect(result).toBe(encryptedBytes);
            }),
        );
        it(
            "should encrypt a buffer",
            PlatformTest.inject([EncryptionService], async (encryptionService: EncryptionService) => {
                // given
                const fileToEnc = Buffer.from("fakeImage");
                const encryptedBytes = Buffer.from("encryptedFake");
                vi.spyOn(Buffer, "concat").mockReturnValue(encryptedBytes);

                // when
                const result = await encryptionService.encrypt(fileToEnc, "foo");

                // then
                expect(result).toBe(encryptedBytes);
            }),
        );
    });
    describe("decrypt", () => {
        it(
            "should decrypt a file",
            PlatformTest.inject([EncryptionService], async (encryptionService: EncryptionService) => {
                // given
                const decryptedBuffer = Buffer.from("decrypted");
                const source = fileUploadModelMock500MBProtected;
                const fileToDecrypt = source.fullLocationOnDisk;
                const filePathSpy = vi.spyOn(FileUtils, "getFilePath").mockReturnValue(fileToDecrypt);
                const password = "foo";
                const fileToDecryptBuffer = Buffer.from(fileToDecrypt);
                const readFileMock = vi.mocked(fs.readFile).mockResolvedValue(fileToDecryptBuffer);
                const argonVerifySpy = vi.spyOn(argon2, "verify").mockResolvedValue(true);
                const fakeIV = "aaaaaaaaaaaaaaaa";
                vi.spyOn(fileToDecryptBuffer, "subarray").mockReturnValue(Buffer.from(fakeIV));
                vi.spyOn(Buffer, "concat").mockReturnValue(decryptedBuffer);

                // when
                const result = await encryptionService.decrypt(source, password);

                // then
                expect(filePathSpy).toBeCalledWith(source);
                expect(readFileMock).toBeCalledWith(fileToDecrypt);
                expect(argonVerifySpy).toBeCalledWith(source.settings?.password, password);
                expect(result).toBe(decryptedBuffer);
            }),
        );
        it(
            "should verify protected file",
            PlatformTest.inject([EncryptionService], async (encryptionService: EncryptionService) => {
                // given
                const source = fileUploadModelMock500MBProtected;
                source.encrypted = false;
                const fileToCheck = source.fullLocationOnDisk;
                const filePathSpy = vi.spyOn(FileUtils, "getFilePath").mockReturnValue(fileToCheck);
                const password = "foo";
                const argonVerifySpy = vi.spyOn(argon2, "verify").mockResolvedValue(true);
                const fileToDecryptBuffer = Buffer.from(fileToCheck);
                const readFileMock = vi.mocked(fs.readFile).mockResolvedValue(fileToDecryptBuffer);
                const decipherivSpy = vi.spyOn(crypto, "createDecipheriv");

                // when
                const result = await encryptionService.decrypt(source, password);

                // then
                expect(filePathSpy).toBeCalledWith(source);
                expect(readFileMock).toBeCalledWith(fileToCheck);
                expect(argonVerifySpy).toBeCalledWith(source.settings?.password, password);
                expect(result).toBe(fileToDecryptBuffer);
                expect(decipherivSpy).not.toHaveBeenCalled();
            }),
        );
        it(
            "should return a non-protected file",
            PlatformTest.inject([EncryptionService], async (encryptionService: EncryptionService) => {
                // given
                const source = fileUploadModelMock500MB;
                const fileToCheck = source.fullLocationOnDisk;
                const fileBuffer = Buffer.from(fileToCheck);
                const filePathSpy = vi.spyOn(FileUtils, "getFilePath").mockReturnValue(fileToCheck);
                const readFileMock = vi.mocked(fs.readFile).mockResolvedValue(fileBuffer);
                const decipherivSpy = vi.spyOn(crypto, "createDecipheriv");

                // when
                const result = await encryptionService.decrypt(source);

                // then
                expect(filePathSpy).toBeCalledWith(source);
                expect(readFileMock).toBeCalledWith(fileToCheck);
                expect(result).toBe(fileBuffer);
                expect(decipherivSpy).not.toHaveBeenCalled();
            }),
        );
    });
});
