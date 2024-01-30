import {Controller, Inject} from "@tsed/di";
import {Delete, Description, Put, Returns} from "@tsed/schema";
import {StatusCodes} from "http-status-codes";
import {FileUploadModelResponse} from "../../../model/rest/FileUploadModelResponse";
import {BadRequest, Forbidden} from "@tsed/exceptions";
import {MultipartFile, PlatformMulterFile, QueryParams, Req} from "@tsed/common";
import {BodyParams} from "@tsed/platform-params";
import {FileEngine} from "../../../engine/FileEngine";
import {FileUploadService} from "../../../services/FileUploadService";

@Controller("/upload")
@Returns(StatusCodes.FORBIDDEN, Forbidden).Description("If your IP has been blocked")
export class FileUploadController {

    @Inject()
    private fileEngine: FileEngine;

    @Inject()
    private fileUploadService: FileUploadService;

    @Put("/")
    @Returns(StatusCodes.CREATED, FileUploadModelResponse)
    @Returns(StatusCodes.BAD_REQUEST, BadRequest)
    @Description("Upload a file or specify URL to a file")
    public async addEntry(@Req() req: Req, @MultipartFile("file") file?: PlatformMulterFile, @BodyParams("url") url?: string): Promise<unknown> {
        if (file && url) {
            if (file) {
                await this.fileEngine.deleteFile(file);
            }
            throw new BadRequest("Unable to upload both a file and a url");
        }
        const ip = req.ip;
        return this.fileUploadService.processUpload(ip, file, url);
    }

    @Delete("/")
    @Returns(StatusCodes.OK, Boolean)
    @Returns(StatusCodes.BAD_REQUEST, BadRequest)
    @Description("Delete a file via the token")
    public async deleteEntry(@QueryParams("token") token: string): Promise<unknown> {
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
