import {Constant, Service} from "@tsed/di";
import {MIME_MAGIC_CONSTANTS} from "../model/constants/utils/MIME_MAGIC_CONSTANTS.js";
import fs from "fs";
import mime from 'mime';
import {BadRequest} from "@tsed/exceptions";
import GlobalEnv from "../model/constants/GlobalEnv.js";

@Service()
export class MimeService {

    @Constant(GlobalEnv.BLOCKED_MIME_TYPES)
    private readonly blockedMimeTypes: string;

    public async isBlocked(filepath: string): Promise<boolean> {
        const detected = await this.findMimeType(filepath);
        if (detected === null) {
            throw new BadRequest("Unable to determine mime type, file rejected");
        }
        return this.blockedMimeTypes.split(',').includes(detected);
    }

    public async findMimeType(filepath: string): Promise<string | null> {
        let fileHandle: fs.promises.FileHandle | null = null;
        try {
            const buffer = Buffer.alloc(1024 * 1024);
            fileHandle = await fs.promises.open(filepath, 'r');
            await fileHandle.read(buffer, 0, buffer.length, 0);
            for (const key in MIME_MAGIC_CONSTANTS) {
                const currentType = MIME_MAGIC_CONSTANTS[key].mime;
                for (const item of MIME_MAGIC_CONSTANTS[key].signs) {
                    const splitSign = item.split(',');
                    if (this.checkMagic(buffer, parseInt(splitSign[0]), splitSign[1])) {
                        return currentType;
                    }
                }
            }
        } finally {
            if (fileHandle) {
                await fileHandle.close();
            }
        }

        return mime.getType(filepath);
    }

    private checkMagic(buffer: Buffer, offset: number, hexstr: string): boolean {
        const hexBuffer: Buffer = Buffer.from(hexstr, 'hex');
        for (let i = 0; i < hexBuffer.length; i++) {
            if (buffer[offset + i] !== hexBuffer[i]) {
                return false;
            }
        }
        return true;
    }
}
