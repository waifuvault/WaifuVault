import { Controller, Inject } from "@tsed/di";
import { Delete, Description, Examples, Get, Name, Patch, Put, Returns, Summary } from "@tsed/schema";
import { StatusCodes } from "http-status-codes";
import { WaifuFileWithAlbum } from "../../../model/dto/WaifuFile.js";
import { FileUploadModel } from "../../../model/db/FileUpload.model.js";
import { BadRequest } from "@tsed/exceptions";
import { Req, Res } from "@tsed/platform-http";
import { BodyParams, PathParams, QueryParams } from "@tsed/platform-params";
import { MultipartFile, type PlatformMulterFile } from "@tsed/platform-multer";
import { FileUploadService } from "../../../services/FileUploadService.js";
import { FileUtils, NetworkUtils } from "../../../utils/Utils.js";
import { BaseRestController } from "../BaseRestController.js";
import { Logger } from "@tsed/logger";
import { EntryModificationDto } from "../../../model/dto/EntryModificationDto.js";
import type { Request, Response } from "express";
import { DefaultRenderException } from "../../../model/rest/DefaultRenderException.js";
import { FileUploadQueryParameters } from "../../../model/rest/FileUploadQueryParameters.js";
import { FileService } from "../../../services/FileService.js";

@Controller("/")
@Description("API for uploading and sharing files.")
@Name("File Upload")
@(Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked"))
export class FileUploadController extends BaseRestController {
    public constructor(
        @Inject() private fileUploadService: FileUploadService,
        @Inject() private fileService: FileService,
        @Inject() private logger: Logger,
    ) {
        super();
    }

    @(Put().Description("Upload a file or specify URL to a file.").Summary("Upload a file or send URL"))
    @(Put("/:bucketToken")
        .Description("Upload a file or a URL to a specific bucket, the bucket must exist")
        .Summary("Upload a file or send URL to a specific bucket"))
    @(Returns(StatusCodes.CREATED, WaifuFileWithAlbum).Description("If the file was stored successfully"))
    @(Returns(StatusCodes.BAD_REQUEST, DefaultRenderException).Description("If the request was malformed"))
    @(Returns(StatusCodes.OK, WaifuFileWithAlbum).Description("If the file already exists"))
    @(Returns(StatusCodes.UNSUPPORTED_MEDIA_TYPE, DefaultRenderException).Description(
        "If the media type of the file specified was blocked",
    ))
    @(Returns(StatusCodes.REQUEST_TOO_LONG, DefaultRenderException).Description(
        "If the file size exceeds the maximum allowed size",
    ))
    public async addEntry(
        @Req() req: Request,
        @Res() res: Response,
        @QueryParams()
        @Examples({
            empty: {
                summary: "Expires: empty",
                description: "expires according to retention policy",
                value: {
                    expires: "",
                },
            },
            "1d": {
                summary: "Expires: 1d",
                description: "expires in 1day",
                value: {
                    expires: "1d",
                },
            },
        })
        params: FileUploadQueryParameters,

        @Description("The file you want to upload")
        @MultipartFile("file")
        file?: PlatformMulterFile,

        @Description("The URL of the file you want to upload")
        @BodyParams("url")
        url?: string,

        @Description(
            "Set a password for this file, this will encrypt the file on the server that not even the server owner can obtain it, when fetching the file. you can fill out the `x-password` http header with your password to obtain the file via API",
        )
        @BodyParams("password")
        password?: string,

        @Description("The bucket you want to upload to")
        @PathParams("bucketToken")
        bucketToken?: string,
    ): Promise<FileUploadModel> {
        if (file && url) {
            if (file) {
                await FileUtils.deleteFile(file);
            }
            throw new BadRequest("Unable to upload both a file and a url");
        }
        if (!file && !url) {
            throw new BadRequest("Please supply a file or url");
        }
        const ip = NetworkUtils.getIp(req);
        let uploadModelResponse: FileUploadModel;
        let alreadyExists: boolean;
        const secretToken = req.query["secret_token"]?.toString();
        try {
            [uploadModelResponse, alreadyExists] = await this.fileUploadService.processUpload({
                ip,
                source: url || file!,
                options: params,
                password,
                secretToken,
                bucketToken,
            });
        } catch (e) {
            this.logger.error(e.message);
            throw e;
        }

        if (alreadyExists) {
            res.status(StatusCodes.OK);
        } else {
            res.status(StatusCodes.CREATED);
            res.location(uploadModelResponse.getPublicUrl());
        }
        return uploadModelResponse;
    }

    @Get("/:token")
    @Returns(StatusCodes.OK, WaifuFileWithAlbum)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Get entry info such as when it will expire and the URL")
    @Summary("Get entry info via token")
    public getInfo(
        @PathParams("token")
        token: string,
        @QueryParams("formatted")
        @Description(
            "If true, this will format the time remaining to a human readable string instead of an epoch if set to false",
        )
        _: boolean,
    ): Promise<FileUploadModel> {
        if (!token) {
            throw new BadRequest("no token provided");
        }
        return this.fileService.getFileInfo(token);
    }

    @Patch("/:token")
    @Returns(StatusCodes.OK, WaifuFileWithAlbum)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Modify an entry such as password, expiry and other settings")
    @Summary("Modify components of an entry")
    public modifyEntry(
        @PathParams("token")
        token: string,
        @BodyParams()
        body: EntryModificationDto,
    ): Promise<FileUploadModel> {
        if (!token) {
            throw new BadRequest("no token provided");
        }
        return this.fileUploadService.modifyEntry(token, body);
    }

    @Delete("/:token")
    @Returns(StatusCodes.OK, Boolean)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Delete a file via the token")
    @Summary("Delete a file from a token")
    public async deleteEntry(@PathParams("token") token: string): Promise<boolean> {
        if (!token) {
            throw new BadRequest("no token provided");
        }
        const deleted = await this.fileService.processDelete([token]);
        if (!deleted) {
            throw new BadRequest(`Unknown token ${token}`);
        }
        return deleted;
    }
}
