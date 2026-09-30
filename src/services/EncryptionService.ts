import { Inject, OnInit, Service } from "@tsed/di";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import * as fs from "node:fs/promises";
import * as crypto from "node:crypto";
import argon2 from "argon2";
import { promisify } from "node:util";
import { Forbidden } from "@tsed/exceptions";
import { SettingsService } from "./SettingsService.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";
import { StorageService } from "./StorageService.js";

@Service()
export class EncryptionService implements OnInit {
    private readonly algorithm = "aes-256-ctr";

    private readonly randomBytes = promisify(crypto.randomBytes);

    private readonly salt: string | null;

    public constructor(
        @Inject() settingsService: SettingsService,
        @Inject() private storageService: StorageService,
    ) {
        this.salt = settingsService.getSetting(GlobalEnv.SALT);
    }

    private getKey(password: string): Promise<Buffer> {
        return argon2.hash(password, {
            hashLength: 32,
            raw: true,
            salt: Buffer.from(this.salt!),
        });
    }

    private async encrypt(buffer: Buffer, password: string): Promise<Buffer | null> {
        if (!this.salt) {
            return null;
        }
        const iv = await this.randomBytes(16);
        const key = await this.getKey(password);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        return Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
    }

    public async encryptFile(filePath: string, password: string): Promise<boolean> {
        if (!this.salt) {
            return false;
        }

        const encryptedBuffer = await this.encrypt(await fs.readFile(filePath), password);
        if (!encryptedBuffer) {
            return false;
        }
        await fs.writeFile(filePath, encryptedBuffer);
        return true;
    }

    public async encryptEntry(entry: FileUploadModel, password: string): Promise<boolean> {
        if (!this.salt) {
            return false;
        }

        const encryptedBuffer = await this.encrypt(await this.storageService.readAll(entry), password);
        if (!encryptedBuffer) {
            return false;
        }
        await this.storageService.write(entry, encryptedBuffer);
        return true;
    }

    public async decrypt(source: FileUploadModel, password: string): Promise<Buffer> {
        const passwordMatches = await this.validatePassword(source, password);
        if (!passwordMatches) {
            throw new Forbidden("Password is incorrect");
        }
        return this.decryptVerified(source, password);
    }

    public async decryptVerified(source: FileUploadModel, password: string): Promise<Buffer> {
        const encrypted = await this.storageService.readAll(source);
        const iv = encrypted.subarray(0, 16);
        const encryptedRest = encrypted.subarray(16);
        const key = await this.getKey(password);
        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        return Buffer.concat([decipher.update(encryptedRest), decipher.final()]);
    }

    public async changePassword(oldPassword: string, newPassword: string, entry: FileUploadModel): Promise<void> {
        const decryptedBuffer = await this.decrypt(entry, oldPassword);
        const newBuffer = await this.encrypt(decryptedBuffer, newPassword);
        if (!newBuffer) {
            throw new Error("Unable to encrypt file");
        }
        await this.storageService.write(entry, newBuffer);
    }

    public validatePassword(resource: FileUploadModel, password: string): Promise<boolean> {
        return argon2.verify(resource.settings!.password!, password);
    }

    public $onInit(): void {
        if (this.salt && this.salt.length !== 8) {
            throw new Error("Salt must be 8 characters");
        }
    }
}
