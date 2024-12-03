import { Constant, OnInit, Service } from "@tsed/di";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import * as fs from "node:fs/promises";
import * as crypto from "node:crypto";
import argon2 from "argon2";
import Path from "node:path";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { promisify } from "node:util";
import { FileUtils } from "../utils/Utils.js";
import { Forbidden } from "@tsed/exceptions";

@Service()
export class EncryptionService implements OnInit {
    private readonly algorithm = "aes-256-ctr";

    private readonly randomBytes = promisify(crypto.randomBytes);

    @Constant(GlobalEnv.SALT)
    private readonly salt: string | undefined;

    private getKey(password: string): Promise<Buffer> {
        return argon2.hash(password, {
            hashLength: 32,
            raw: true,
            salt: Buffer.from(this.salt!),
        });
    }

    public async encrypt(file: string | Buffer, password: string): Promise<Buffer | null> {
        if (!this.salt) {
            return null;
        }
        let buffer: Buffer;
        if (typeof file === "string") {
            const fileSource = FileUtils.getFilePath(Path.basename(file));
            buffer = await fs.readFile(fileSource);
        } else {
            buffer = file;
        }
        const iv = await this.randomBytes(16);
        const key = await this.getKey(password);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        const encryptedBuffer = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
        if (typeof file === "string") {
            await fs.writeFile(file, encryptedBuffer);
        }
        return encryptedBuffer;
    }

    public async decrypt(source: FileUploadModel, password: string): Promise<Buffer> {
        const fileSource = FileUtils.getFilePath(source);
        /* const isEncrypted = source.encrypted;

        if (!source.settings?.password) {
            // no password, thus not encrypted, just return file stream
            return createReadStream(fileSource);
        }

        if (!password) {
            throw new Forbidden(`${isEncrypted ? "Encrypted" : "Protected"} file requires a password`);
        }

        const passwordMatches = await this.validatePassword(source, password);
        if (!passwordMatches) {
            throw new Forbidden("Password is incorrect");
        }

        if (!isEncrypted) {
            // the file is password protected, but not encrypted, so return it
            return createReadStream(fileSource);
        }*/

        const passwordMatches = await this.validatePassword(source, password);
        if (!passwordMatches) {
            throw new Forbidden("Password is incorrect");
        }
        const encrypted = await fs.readFile(fileSource);
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
        await fs.writeFile(FileUtils.getFilePath(entry), newBuffer);
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
