import {Controller, Inject} from "@tsed/di";
import {Delete, Description, Example, Examples, Get, Name, Put, Returns, Summary} from "@tsed/schema";
import {StatusCodes} from "http-status-codes";
import {FileUploadModelResponse} from "../../../model/rest/FileUploadModelResponse.js";
import {BadRequest, Forbidden, UnsupportedMediaType} from "@tsed/exceptions";
import {MultipartFile, PathParams, type PlatformMulterFile, QueryParams, Req, Res} from "@tsed/common";
import {BodyParams} from "@tsed/platform-params";
import {FileEngine} from "../../../engine/FileEngine.js";
import {FileService} from "../../../services/FileService.js";
import {NetworkUtils} from "../../../utils/Utils.js";

@Controller("/")
@Returns(StatusCodes.FORBIDDEN, Forbidden).Description("If your IP has been blocked")
@Description("This is the API documentation for uploading and sharing files.")
@Name("File Uploader")
export class FileUploadController {
    public constructor(
        @Inject() private fileEngine: FileEngine,
        @Inject() private fileUploadService: FileService
    ) {
    }

    @Put()
    @Returns(StatusCodes.CREATED, FileUploadModelResponse).Description("If the file was stored successfully")
    @Returns(StatusCodes.BAD_REQUEST, BadRequest).Description("If the request was malformed")
    @Returns(StatusCodes.OK, FileUploadModelResponse).Description("If the file already exists")
    @Returns(StatusCodes.UNSUPPORTED_MEDIA_TYPE, UnsupportedMediaType).Description("If the media type of the file specified was blocked")
    @Example({
        description: "foo",
        summary: "bnar"
    })
    @Summary("Upload a file or send URL")
    @Description("Upload a file or specify URL to a file. Use the location header in the response or the url prop in the JSON to get the URL of the file")
    public async addEntry(@Req()
                              req: Req,
                          @Res()
                              res: Res,
                          @QueryParams("expires")
                          @Examples({
                              "empty": {
                                  summary: "empty",
                                  description: "expires according to retention policy",
                                  value: ""
                              },
                              "1d": {
                                  summary: "1d",
                                  description: "expires in 1day",
                                  value: "1d"
                              }
                          })
                          @Description("a string containing a number and a letter of `m` for mins, `h` for hours, `d` for days. For example: `1h` would be 1 hour and `1d` would be 1 day. leave this blank if you want the file to exist according to the retention policy")
                              expires?: string,
                          @QueryParams("hide_filename")
                          @Description("if set to true, then your filename will not appear in the URL. if false, then it will appear in the URL. defaults to false")
                              hideFileName?: boolean,
                          @QueryParams("password")
                              @Description("Set a password for this file, this does not encrypt the file, but rather asks for the password when someone goes to the URL. when fetching the file. you can fill out the `x-password` http header with your password to obtain the file via API")
                                  password?: string,
                          @MultipartFile("file") file?: PlatformMulterFile,
                          @BodyParams("url") url?: string): Promise<unknown> {
        if (file && url) {
            if (file) {
                await this.fileEngine.deleteFile(file);
            }
            throw new BadRequest("Unable to upload both a file and a url");
        }
        if (!file && !url) {
            throw new BadRequest("Please supply a file or url");
        }
        if (expires) {
            const checkExpires = /[mhd]/;
            expires = expires.toLowerCase().replace(/ /g, '');
            if (!checkExpires.test(expires)) {
                throw new BadRequest("bad expire string format");
            }
        }
        const ip = NetworkUtils.getIp(req);
        const [uploadModelResponse, alreadyExists] = await this.fileUploadService.processUpload(
            ip,
            url || file!,
            expires,
            hideFileName,
            password
        );
        if (alreadyExists) {
            res.status(StatusCodes.OK);
        } else {
            res.status(StatusCodes.CREATED);
            res.location(uploadModelResponse.url);
        }
        return uploadModelResponse;
    }


    @Get("/:token")
    @Returns(StatusCodes.OK, FileUploadModelResponse)
    @Returns(StatusCodes.BAD_REQUEST, BadRequest)
    @Description("Get entry info such as when it will expire and the URL")
    @Summary("Get entry info via token")
    public getInfo(
        @PathParams("token")
            token: string,
        @QueryParams("formatted")
        @Description("If true, this will format the time remaining to a human readable string instead of an epoch if set to false")
            humanReadable: boolean): Promise<unknown> {
        if (!token) {
            throw new BadRequest("no token provided");
        }
        return this.fileUploadService.getFileInfo(token, humanReadable);
    }


    @Delete("/:token")
    @Returns(StatusCodes.OK, Boolean)
    @Returns(StatusCodes.BAD_REQUEST, BadRequest)
    @Description("Delete a file via the token")
    @Summary("Delete a file from a token")
    public async deleteEntry(@PathParams("token") token: string): Promise<unknown> {
        if (!token) {
            throw new BadRequest("no token provided");
        }
        const deleted = await this.fileUploadService.processDelete(token);
        if (!deleted) {
            throw new BadRequest(`Unknown token ${token}`);
        }
        return deleted;
    }
}
