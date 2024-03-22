import { Controller, Inject } from "@tsed/di";
import { Delete, Description, Example, Examples, Get, Name, Patch, Put, Returns, Summary } from "@tsed/schema";
import { StatusCodes } from "http-status-codes";
import { FileUploadResponseDto } from "../../../model/dto/FileUploadResponseDto.js";
import { BadRequest } from "@tsed/exceptions";
import { MultipartFile, PathParams, type PlatformMulterFile, QueryParams, Req, Res } from "@tsed/common";
import { BodyParams } from "@tsed/platform-params";
import { FileService } from "../../../services/FileService.js";
import { FileUtils, NetworkUtils } from "../../../utils/Utils.js";
import { BaseRestController } from "../BaseRestController.js";
import { Logger } from "@tsed/logger";
import { EntryModificationDto } from "../../../model/dto/EntryModificationDto.js";
import type { Request, Response } from "express";
import { DefaultRenderException } from "../../../model/rest/DefaultRenderException.js";
import { FileUploadParameters } from "../../../model/rest/FileUploadParameters.js";

@Controller("/")
@Description("This is the API documentation for uploading and sharing files.")
@Name("File Uploader")
@Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked")
export class FileUploadController extends BaseRestController {
    public constructor(
        @Inject() private fileUploadService: FileService,
        @Inject() private logger: Logger,
    ) {
        super();
    }

    @Put()
    @Returns(StatusCodes.CREATED, FileUploadResponseDto).Description("If the file was stored successfully")
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException).Description("If the request was malformed")
    @Returns(StatusCodes.OK, FileUploadResponseDto).Description("If the file already exists")
    @Returns(StatusCodes.UNSUPPORTED_MEDIA_TYPE, DefaultRenderException).Description(
        "If the media type of the file specified was blocked",
    )
    @Example({
        description: "foo",
        summary: "bnar",
    })
    @Summary("Upload a file or send URL")
    @Description(
        "Upload a file or specify URL to a file. Use the location header in the response or the url prop in the JSON to get the URL of the file",
    )
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
        params: FileUploadParameters,
        @MultipartFile("file") file?: PlatformMulterFile,
        @BodyParams("url") url?: string,
    ): Promise<unknown> {
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
        let uploadModelResponse: FileUploadResponseDto;
        let alreadyExists: boolean;
        try {
            [uploadModelResponse, alreadyExists] = await this.fileUploadService.processUpload(
                ip,
                url || file!,
                params.expires,
                params.hide_filename,
                params.password,
                params.secret_token,
            );
        } catch (e) {
            this.logger.error(e.message);
            if (file) {
                // this will delete files if something goes wrong, but not urls...
                // TODO: fix
                await FileUtils.deleteFile(file, true);
            }
            throw e;
        }
        if (alreadyExists) {
            res.status(StatusCodes.OK);
        } else {
            res.status(StatusCodes.CREATED);
            res.location(uploadModelResponse.url);
        }
        return uploadModelResponse;
    }

    @Get("/:token")
    @Returns(StatusCodes.OK, FileUploadResponseDto)
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
        humanReadable: boolean,
    ): Promise<unknown> {
        if (!token) {
            throw new BadRequest("no token provided");
        }
        return this.fileUploadService.getFileInfo(token, humanReadable);
    }

    @Patch("/:token")
    @Returns(StatusCodes.OK, FileUploadResponseDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Modify an entry such as password, expiry and other settings")
    @Summary("Modify components of an entry")
    public modifyEntry(
        @PathParams("token")
        token: string,
        @BodyParams()
        body: EntryModificationDto,
    ): Promise<unknown> {
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
    public async deleteEntry(@PathParams("token") token: string): Promise<unknown> {
        if (!token) {
            throw new BadRequest("no token provided");
        }
        const deleted = await this.fileUploadService.processDelete([token]);
        if (!deleted) {
            throw new BadRequest(`Unknown token ${token}`);
        }
        return deleted;
    }
}
