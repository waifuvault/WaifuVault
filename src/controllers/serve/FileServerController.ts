import { Get, Hidden } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { HeaderParams, PathParams, Res } from "@tsed/common";
import * as Path from "node:path";
import { FileProtectedException } from "../../model/exceptions/FileProtectedException.js";
import { MimeService } from "../../services/MimeService.js";
import type { Response } from "express";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { FileService } from "../../services/FileService.js";
import { FileUploadService } from "../../services/FileUploadService.js";
import { ReadStream } from "node:fs";

@Hidden()
@Controller("/")
export class FileServerController {
    public constructor(
        @Inject() private fileService: FileService,
        @Inject() private mimeService: MimeService,
        @Inject() private fileUploadService: FileUploadService,
    ) {}

    @Get("/:t/:file(*)?")
    public async getFile(
        @Res() res: Response,
        @PathParams("t") resource: string,
        @HeaderParams("x-password") password?: string,
        @PathParams("file") requestedFileName?: string,
    ): Promise<ReadStream> {
        await this.hasPassword(resource, password);
        const [stream, entry] = await this.fileService.getEntry(resource, requestedFileName, password);
        // const mimeType = await this.mimeService.findMimeTypeFromStream(buff, entry.fullFileNameOnSystem);
        res.on("finish", () => this.postProcess(entry));
        const mime = stream.fileType?.mime;
        if (mime) {
            res.contentType(mime);
        } else {
            // unknown, send an octet-stream and let the client figure it out
            res.contentType("application/octet-stream");
        }
        return stream as ReadStream;
    }

    private async postProcess(entry: FileUploadModel): Promise<void> {
        const hasOneTimeDownload = entry.settings?.oneTimeDownload ?? false;
        if (hasOneTimeDownload) {
            await this.fileService.processDelete([entry.token]);
            return;
        }
        await this.fileUploadService.incrementViews(entry.token);
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
