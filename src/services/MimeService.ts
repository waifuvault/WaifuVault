import {Service} from "@tsed/di";
import {DetectionResult} from "../utils/typeings";
import {mimemagics} from "../utils/mimemagics";
import fs from "fs";

@Service()
export class MimeService {
    private blockedTypes:string[] = [
        'application/x-dosexec',
        'application/x-executable',
        'application/x-hdf5',
        'application/x-java-archive',
        'application/vnd.rar'
    ];
    public async isBlocked(filepath:string): Promise<boolean> {
        // Read first 1MB
        const buffer = Buffer.alloc(1024 * 1024);
        const fileHandle = await fs.promises.open(filepath, 'r');
        await fileHandle.read(buffer, 0, buffer.length, 0);
        await fileHandle.close();

        const detected: DetectionResult = this.findMimeType(buffer);
        console.log(detected.mime);
        return this.blockedTypes.includes(detected.mime);
    }
    public findMimeType(buffer:Buffer): DetectionResult {
        let result : DetectionResult = {ext:'', mime:''};
        for(const key in mimemagics) {
            const currentType = mimemagics[key].mime;
            for(let j = 0; j<mimemagics[key].signs.length; j++) {
                const splitSign = mimemagics[key].signs[j].split(',');
                if(this.checkMagic(buffer,parseInt(splitSign[0]),splitSign[1])) {
                    result = {ext:key, mime:currentType};
                    return result;
                }
            }
        }
        return result;
    }

    private checkMagic(buffer:Buffer, offset:number, hexstr:string):boolean {
        const hexBuffer:Buffer = Buffer.from(hexstr,'hex');
        for (let i = 0; i < hexBuffer.length; i++) {
            if (buffer[offset + i] !== hexBuffer[i]) {
                return false;
            }
        }
        return true;
    }
}