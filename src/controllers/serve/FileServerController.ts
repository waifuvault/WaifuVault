import {Get, Hidden} from "@tsed/schema";
import {Controller, Inject} from "@tsed/di";
import {HeaderParams, PathParams, Res} from "@tsed/common";
import * as Path from "node:path";
import {FileService} from "../../services/FileService.js";
import {FileProtectedException} from "../../model/exceptions/FileProtectedException.js";
import {MimeService} from "../../services/MimeService.js";

@Hidden()
@Controller("/")
export class FileServerController {

    public constructor(
        @Inject() private fileService: FileService,
        @Inject() private mimeService: MimeService
    ) {
    }

    @Get("/:t/:file?")
    public async getFile(
        @Res() res: Res,
        @PathParams("t") resource: string,
        @HeaderParams("x-password") password?: string,
        @PathParams("file") requestedFileName?: string
    ): Promise<void> {
        await this.hasPassword(resource, password);
        const [buff, entry] = await this.fileService.getEntry(resource, requestedFileName, password);
        const mimeType = await this.mimeService.findMimeTypeFromBuffer(buff, entry.fullFileNameOnSystem);
        if (mimeType) {
            res.contentType(mimeType);
        } else {
            // unknown> just send an octet stream and let the client figure it out
            res.contentType("application/octet-stream");
        }
        res.send(buff);
    }

    private async hasPassword(resource: string, password?: string): Promise<boolean> {
        resource = Path.parse(resource).name;
        const resourceIsProtected = await this.isFilePasswordProtected(resource);
        if (resourceIsProtected && !password) {
            const isEncrypted = await this.fileService.isFileEncrypted(resource);
            throw new FileProtectedException("This file requires `x-password` to be set and correct", isEncrypted);
        }
        return resourceIsProtected;
    }

    private isFilePasswordProtected(resource: string): Promise<boolean> {
        return this.fileService.requiresPassword(resource);
    }
}
