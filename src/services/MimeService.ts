import { Inject, Service } from "@tsed/di";
import mime from "mime";
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";
import fs from "node:fs/promises";
import { SettingsService } from "./SettingsService.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";

@Service()
export class MimeService {
    private readonly blockedMimeTypes: string | null = null;

    public constructor(@Inject() settingsService?: SettingsService) {
        if (settingsService) {
            this.blockedMimeTypes = settingsService.getSetting(GlobalEnv.BLOCKED_MIME_TYPES);
        }
    }

    private async readFirstKB(filePath: string): Promise<Buffer> {
        const fileHandle = await fs.open(filePath, "r");
        const buff = Buffer.alloc(1024);
        try {
            await fileHandle.read(buff, 0, 1024, 0);
        } finally {
            await fileHandle.close();
        }
        return buff;
    }

    public async isBlocked(filepath: string): Promise<boolean> {
        if (!this.blockedMimeTypes) {
            return false;
        }
        const detected = await this.findMimeType(filepath);
        if (detected === null) {
            // if the media type can't be calculated, just allow it
            return false;
        }
        return this.blockedMimeTypes.split(",").includes(detected);
    }

    public async findMimeTypeFromBuffer(buff: Buffer, resourceName?: string): Promise<string | null> {
        // the order is very important, do not change

        // first check the buffer magic bytes
        const mimeFromBuffer = await fileTypeFromBuffer(buff);
        if (mimeFromBuffer) {
            return mimeFromBuffer.mime;
        }

        // then check the extension
        if (resourceName) {
            const extType = mime.getType(resourceName);
            if (extType) {
                return extType;
            }
        }

        // if there still is no mapping, see if the file is plain text
        if (this.isText(buff)) {
            return "text/plain";
        }

        return null;
    }

    public async findMimeType(filepath: string): Promise<string | null> {
        // the order is very important, do not change

        try {
            // check the file itself against magic BOM
            const mimeType = await fileTypeFromFile(filepath);
            if (mimeType) {
                return mimeType.mime;
            }
        } catch {
            return null;
        }
        // then check it via the file extension
        const extType = mime.getType(filepath);
        if (extType) {
            return extType;
        }

        // if there still is no mapping, see if the file is plain text
        const firstKb = await this.readFirstKB(filepath);
        if (this.isText(firstKb)) {
            return "text/plain";
        }

        return null;
    }

    private isText(buffer: Buffer): boolean {
        return !buffer.toString("utf-8", 0, 1024).includes("\uFFFD");
    }
}
