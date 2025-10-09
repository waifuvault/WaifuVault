import { Get, Header, Hidden } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Req, Res } from "@tsed/platform-http";
import { HeaderParams, PathParams, QueryParams } from "@tsed/platform-params";
import * as Path from "node:path";
import { FileProtectedException } from "../../model/exceptions/FileProtectedException.js";
import type { Request, Response } from "express";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";
import { FileService } from "../../services/FileService.js";
import { FileUploadService } from "../../services/FileUploadService.js";
import { EntryEncryptionWrapper } from "../../model/rest/EntryEncryptionWrapper.js";
import { StatusCodes } from "http-status-codes";
import { FileUtils } from "../../utils/Utils.js";
import { SettingsService } from "../../services/SettingsService.js";
import { GlobalEnv } from "../../model/constants/GlobalEnv.js";
import { RedirectException } from "@tsed/exceptions";

@Hidden()
@Controller("/")
export class FileServerController {
    private readonly allowedChunkMimeTypes = ["video/", "audio/"];
    private readonly chunkSize = 10 ** 6; // 1MB
    private readonly frontendUrl: string | null = null;
    private readonly backendUrl: string;

    public constructor(
        @Inject() private fileService: FileService,
        @Inject() private fileUploadService: FileUploadService,
        @Inject() settingsService: SettingsService,
    ) {
        this.frontendUrl = settingsService.getSetting(GlobalEnv.FRONT_END_URL);
        this.backendUrl = settingsService.getSetting(GlobalEnv.BASE_URL);
    }

    @Get("/:t")
    @Get("/:t/:file")
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
        @QueryParams("check") check?: boolean,
    ): Promise<unknown> {
        try {
            console.log(check);
            await this.hasPassword(resource, req, check, password);
        } catch (e) {
            if (e instanceof RedirectException) {
                const requestUrl = new URL(req.originalUrl, `${req.protocol}://${req.host}`);
                requestUrl.pathname = requestUrl.pathname.replace(/^\/f\//, "/p/");
                res.redirect(StatusCodes.PERMANENT_REDIRECT, requestUrl.toString());
                return;
            }
            throw e;
        }

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

        if (
            this.allowedChunkMimeTypes.some(substr => mime.startsWith(substr)) &&
            !entryWrapper.entry.encrypted &&
            !entryWrapper.entry.settings?.oneTimeDownload &&
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
            res.setHeader("Content-Length", videoSize);
            res.writeHead(StatusCodes.OK, { "Content-Type": contentType });
            const videoStream = await entryWrapper.getStream();
            videoStream.pipe(res);
            return;
        }
        let start = parseInt(rangeMatch[1], 10);
        let end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : Math.min(start + this.chunkSize, videoSize - 1);

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

    private async hasPassword(resource: string, req: Request, check = false, password?: string): Promise<boolean> {
        resource = Path.parse(resource).name;
        const resourceIsProtected = await this.isFilePasswordProtected(resource);
        if (resourceIsProtected && !password) {
            if (req.path.includes("/f") && this.backendUrl === this.frontendUrl && !check) {
                throw new RedirectException(StatusCodes.PERMANENT_REDIRECT, "Redirecting to password protected file");
            }

            const isEncrypted = await this.fileService.isFileEncrypted(resource);
            const resourceUrl = await this.fileService.getFileUrl(resource);

            throw new FileProtectedException(
                "This file requires `x-password` to be set and correct",
                isEncrypted,
                resourceUrl ?? "",
            );
        }
        return resourceIsProtected;
    }

    private isFilePasswordProtected(resource: string): Promise<boolean> {
        return this.fileService.requiresPassword(resource);
    }
}
