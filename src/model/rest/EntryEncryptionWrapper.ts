import { FileUploadModel } from "../db/FileUpload.model.js";
import { AutoInjectable, Inject } from "@tsed/di";
import { EncryptionService } from "../../services/EncryptionService.js";
import { createReadStream, ReadStream } from "node:fs";
import { FileUtils } from "../../utils/Utils.js";
import fs from "node:fs/promises";

@AutoInjectable()
export class EntryEncryptionWrapper {
    public constructor(
        public entry: FileUploadModel,
        @Inject() private encryptionService?: EncryptionService,
    ) {}

    public async getStream(password?: string, opts?: { start?: number; end?: number }): Promise<ReadStream> {
        if (this.entry.encrypted) {
            this.checkPassword(password);
            const b = await this.getBuffer(password);
            return ReadStream.from(b) as ReadStream;
        }
        return createReadStream(FileUtils.getFilePath(this.entry), opts);
    }

    public getBuffer(password?: string): Promise<Buffer> {
        if (this.entry.encrypted) {
            this.checkPassword(password);
            return this.encryptionService!.decrypt(this.entry, password!);
        }
        return fs.readFile(FileUtils.getFilePath(this.entry));
    }

    private checkPassword(password?: string): void {
        if (this.entry.encrypted) {
            if (!password) {
                throw new Error("Password is required to decrypt file");
            }
        }
    }
}
