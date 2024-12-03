import { FileUploadModel } from "../db/FileUpload.model.js";
import { AutoInjectable, Inject } from "@tsed/di";
import { EncryptionService } from "../../services/EncryptionService.js";
import { createReadStream, ReadStream } from "node:fs";
import { FileUtils } from "../../utils/Utils.js";

@AutoInjectable()
export class EntryEncryptionWrapper {
    public constructor(
        public entry: FileUploadModel,
        @Inject() private encryptionService?: EncryptionService,
    ) {}

    public async getStream(password?: string, opts?: { start?: number; end?: number }): Promise<ReadStream> {
        if (this.entry.encrypted) {
            if (!password) {
                throw new Error("Password is required to decrypt file");
            }
            const b = await this.encryptionService!.decrypt(this.entry, password);
            return ReadStream.from(b) as ReadStream;
        }
        return createReadStream(FileUtils.getFilePath(this.entry), opts);
    }
}
