import { Constant, Service } from "@tsed/di";
import mime from "mime";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";
import fs from "node:fs/promises";

@Service()
export class MimeService {
    @Constant(GlobalEnv.BLOCKED_MIME_TYPES)
    private readonly blockedMimeTypes: string;

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
        const mimeFromBuffer = await fileTypeFromBuffer(buff);
        if (mimeFromBuffer) {
            return mimeFromBuffer.mime;
        }
        if (resourceName) {
            const extType = mime.getType(resourceName);
            if (extType) {
                return extType;
            }
        }
        const isText = !buff.toString("utf-8", 0, 1024).includes("\uFFFD");
        if (isText) {
            return "text/plain";
        }
        return null;
    }

    public async findMimeType(filepath: string): Promise<string | null> {
        try {
            const mimeType = await fileTypeFromFile(filepath);
            if (mimeType) {
                return mimeType.mime;
            }
        } catch {
            return null;
        }
        const extType = mime.getType(filepath);
        if (extType) {
            return extType;
        }
        const firstKb = await this.readFirstKB(filepath);
        const isText = !firstKb.toString("utf-8", 0, 1024).includes("\uFFFD");
        if (isText) {
            return "text/plain";
        }
        return null;
    }
}
