import { Get, Hidden } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { HeaderParams, PathParams, QueryParams, Req, Res } from "@tsed/common";
import * as Path from "node:path";
import { FileProtectedException } from "../../model/exceptions/FileProtectedException.js";
import type { Request, Response } from "express";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { FileService } from "../../services/FileService.js";
import { FileUploadService } from "../../services/FileUploadService.js";
import { EntryEncryptionWrapper } from "../../model/rest/EntryEncryptionWrapper.js";
import { StatusCodes } from "http-status-codes";

@Hidden()
@Controller("/")
export class FileServerController {
    public constructor(
        @Inject() private fileService: FileService,
        @Inject() private fileUploadService: FileUploadService,
    ) {}

    private readonly allowedChunkMimeTypes = ["video/", "audio/"];
    private readonly chunkSize = 10 ** 6; // 1MB

    @Get("/:t/:file(*)?")
    public async getFile(
        @Res() res: Response,
        @Req() req: Request,
        @PathParams("t") resource: string,
        @HeaderParams("x-password") password?: string,
        @PathParams("file") requestedFileName?: string,
        @QueryParams("download") download?: boolean,
    ): Promise<unknown> {
        await this.hasPassword(resource, password);
        const entryWrapper = await this.fileService.getEntry(resource, requestedFileName, password);
        const mime = entryWrapper.entry.mediaType ?? "application/octet-stream"; // unknown, send an octet-stream and let the client figure it out

        if (download) {
            res.attachment(entryWrapper.entry.fileName);
        }
        res.contentType(mime);
        if (download) {
            return entryWrapper.getBuffer(password);
        }

        // no chunking if your video is encrypted or one time download
        if (
            this.allowedChunkMimeTypes.some(substr => mime.startsWith(substr)) &&
            !entryWrapper.entry.encrypted &&
            !entryWrapper.entry.settings?.oneTimeDownload &&
            // if there is no range, we should not chunk data, just send the stream to prevent people from downloading the video
            req.headers.range
        ) {
            await this.chunkData(res, req, mime, entryWrapper);
            return;
        }
        res.on("finish", () => this.postProcess(entryWrapper.entry));
        if (this.allowedChunkMimeTypes.some(substr => mime.startsWith(substr))) {
            return entryWrapper.getStream(password);
        }
        return entryWrapper.getBuffer(password);
    }

    private async chunkData(
        res: Response,
        req: Request,
        contentType: string,
        entryWrapper: EntryEncryptionWrapper,
    ): Promise<void> {
        const range = req.headers.range!;
        const videoSize = entryWrapper.entry.fileSize;
        const start = Number(range.replace(/\D/g, ""));
        const end = Math.min(start + this.chunkSize, videoSize - 1);
        const contentLength = end - start + 1;
        const headers = {
            "Content-Range": `bytes ${start}-${end}/${videoSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": contentLength,
            "Content-Type": contentType,
        };
        res.writeHead(StatusCodes.PARTIAL_CONTENT, headers);
        const videoStream = await entryWrapper.getStream(undefined, { start, end });
        videoStream.pipe(res);
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
