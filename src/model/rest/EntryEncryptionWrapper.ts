import { FileUploadModel } from "../db/FileUpload.model.js";
import { AutoInjectable, Inject } from "@tsed/di";
import { EncryptionService } from "../../services/EncryptionService.js";
import { Readable } from "node:stream";
import { StorageService } from "../../services/StorageService.js";
import type { ByteRange } from "../../utils/typeings.js";

@AutoInjectable()
export class EntryEncryptionWrapper {
    public constructor(
        public entry: FileUploadModel,
        @Inject() private encryptionService?: EncryptionService,
        @Inject() private storageService?: StorageService,
    ) {}

    public async getStream(password?: string, range?: ByteRange): Promise<Readable> {
        if (this.entry.encrypted) {
            this.checkPassword(password);
            const b = await this.getBuffer(password);
            return Readable.from(b);
        }

        return this.storageService!.openStream(this.entry, range);
    }

    public getBuffer(password?: string): Promise<Buffer> {
        if (this.entry.encrypted) {
            this.checkPassword(password);
            return this.encryptionService!.decryptVerified(this.entry, password!);
        }
        return this.storageService!.readAll(this.entry);
    }

    private checkPassword(password?: string): void {
        if (this.entry.encrypted) {
            if (!password) {
                throw new Error("Password is required to decrypt file");
            }
        }
    }
}
