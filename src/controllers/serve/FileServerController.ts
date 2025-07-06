import { Get, Header, Hidden } from "@tsed/schema";
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
import { FileUtils } from "../../utils/Utils.js";

@Hidden()
@Controller("/")
export class FileServerController {
    public constructor(
        @Inject() private fileService: FileService,
        @Inject() private fileUploadService: FileUploadService,
    ) {}

    private readonly allowedChunkMimeTypes = ["video/", "audio/"];
    private readonly chunkSize = 10 ** 6; // 1MB

    @Get("/:t/{:file}")
    @Header({
        "Content-Encoding": "identity", // disable gzip
    })
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
        const mime = entryWrapper.entry.mediaType ?? "application/octet-stream";

        if (download) {
            res.attachment(entryWrapper.entry.parsedFileName);
        }
        res.contentType(mime);

        if (download) {
            res.setHeader("Content-Length", entryWrapper.entry.fileSize);
            res.on("finish", () => this.postProcess(entryWrapper.entry));
            return entryWrapper.getStream(password);
        }

        if (FileUtils.isVideo(entryWrapper.entry) || FileUtils.isAudio(entryWrapper.entry)) {
            res.setHeader("accept-ranges", "bytes");
        }

        // Chunking is applied only if the mime type is allowed, the file is not encrypted,
        // it's not a one-time download, and a valid Range header is present.
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

        res.setHeader("Content-Length", entryWrapper.entry.fileSize);
        res.on("finish", () => this.postProcess(entryWrapper.entry));
        if (entryWrapper.entry.encrypted) {
            return entryWrapper.getBuffer(password);
        }
        return entryWrapper.getStream(password);
    }

    private async chunkData(
        res: Response,
        req: Request,
        contentType: string,
        entryWrapper: EntryEncryptionWrapper,
    ): Promise<void> {
        const range = req.headers.range!;
        const videoSize = entryWrapper.entry.fileSize;

        const rangeMatch = range.match(/bytes=(\d*)-(\d*)/);
        if (!rangeMatch) {
            // Malformed range header; fall back to full content delivery.
            res.setHeader("Content-Length", videoSize);
            res.writeHead(StatusCodes.OK, { "Content-Type": contentType });
            const videoStream = await entryWrapper.getStream();
            videoStream.pipe(res);
            return;
        }
        let start = parseInt(rangeMatch[1], 10);
        // If the end is not provided, use a default chunk size or until the end of the file.
        let end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : Math.min(start + this.chunkSize, videoSize - 1);

        // Validate start and end bounds
        if (Number.isNaN(start) || start < 0) {
            start = 0;
        }
        if (Number.isNaN(end) || end >= videoSize) {
            end = videoSize - 1;
        }
        if (start > end) {
            res.status(StatusCodes.REQUESTED_RANGE_NOT_SATISFIABLE).send("Invalid range");
            return;
        }

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
