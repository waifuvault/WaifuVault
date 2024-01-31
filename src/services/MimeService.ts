import {Constant, Service} from "@tsed/di";
import mime from 'mime';
import {BadRequest} from "@tsed/exceptions";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import {fileTypeFromFile} from 'file-type';

@Service()
export class MimeService {

    @Constant(GlobalEnv.BLOCKED_MIME_TYPES)
    private readonly blockedMimeTypes: string;

    public async isBlocked(filepath: string): Promise<boolean> {
        if (!this.blockedMimeTypes) {
            return false;
        }
        const detected = await this.findMimeType(filepath);
        if (detected === null) {
            throw new BadRequest("Unable to determine mime type, file rejected");
        }
        return this.blockedMimeTypes.split(',').includes(detected);
    }

    public async findMimeType(filepath: string): Promise<string | null> {
        const mimeType = await fileTypeFromFile(filepath);
        if (mimeType) {
            return mimeType.mime;
        }
        return mime.getType(filepath);
    }
}
