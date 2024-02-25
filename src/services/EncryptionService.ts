import {Constant, Inject, OnInit, Service} from "@tsed/di";
import {FileUploadModel} from "../model/db/FileUpload.model.js";
import fs from "node:fs/promises";
import {FileEngine} from "../engine/impl/index.js";
import crypto from "node:crypto";
import argon2 from "argon2";
import {Forbidden} from "@tsed/exceptions";
import * as Path from "path";
import GlobalEnv from "../model/constants/GlobalEnv.js";

@Service()
export class EncryptionService implements OnInit {

    private readonly algorithm = 'aes-256-ctr';

    @Constant(GlobalEnv.SALT)
    private readonly salt: string | undefined;

    public constructor(
        @Inject() private fileEngine: FileEngine
    ) {
    }

    private getKey(password: string): Promise<Buffer> {
        return argon2.hash(password, {
            hashLength: 32,
            raw: true,
            salt: Buffer.from(this.salt!),
            saltLength: 8
        });
    }

    public async encrypt(filePath: string, password: string): Promise<boolean> {
        if (!this.salt) {
            return false;
        }
        const fileSource = this.fileEngine.getFilePath(Path.basename(filePath));
        const buffer = await fs.readFile(fileSource);
        const iv = crypto.randomBytes(16);
        const key = await this.getKey(password);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        const encryptedBuffer = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
        await fs.writeFile(fileSource, encryptedBuffer);
        return true;
    }

    public async decrypt(source: FileUploadModel, password?: string): Promise<Buffer> {
        const fileSource = this.fileEngine.getFilePath(source);
        if (!source.settings?.password) {
            // no password, thus not encrypted, just return buffer
            return fs.readFile(fileSource);
        }
        if (!password) {
            throw new Forbidden("Protected file requires a password");
        }
        const passwordMatches = await this.validatePassword(source, password);
        if (!passwordMatches) {
            throw new Forbidden("Password is incorrect");
        }
        if (!source.encrypted) {
            // the file is password protected, but not encrypted, so return it
            return fs.readFile(fileSource);
        }
        // we can now assume the password is valid
        const encrypted = await fs.readFile(fileSource);
        const iv = encrypted.subarray(0, 16);
        const encryptedRest = encrypted.subarray(16);
        const key = await this.getKey(password);
        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        return Buffer.concat([decipher.update(encryptedRest), decipher.final()]);
    }

    private validatePassword(resource: FileUploadModel, password: string): Promise<boolean> {
        return argon2.verify(resource.settings!.password!, password);
    }

    public $onInit(): void {
        if (this.salt && this.salt.length !== 8) {
            throw new Error("Salt must be 8 characters");
        }
    }
}
