import { BaseRestController } from "../BaseRestController.js";
import { Controller, Inject } from "@tsed/di";
import {
    CollectionOf,
    Default,
    Delete,
    Description,
    Get,
    Name,
    Optional,
    Post,
    Required,
    Returns,
    Summary,
} from "@tsed/schema";
import { StatusCodes } from "http-status-codes";
import { DefaultRenderException } from "../../../model/rest/DefaultRenderException.js";
import { AlbumDto } from "../../../model/dto/AlbumDto.js";
import { BodyParams } from "@tsed/platform-params";
import { PathParams, PlatformResponse, QueryParams, Res } from "@tsed/common";
import { AlbumService } from "../../../services/AlbumService.js";
import { SuccessModel } from "../../../model/rest/SuccessModel.js";
import { AlbumModel } from "../../../model/db/Album.model.js";
import { PublicAlbumDto } from "../../../model/dto/PublicAlbumDto.js";
import { BadRequest } from "@tsed/exceptions";

@Controller("/album")
@Description("API for CRUD operations of albums and associating files with them.")
@Name("Album management")
@(Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked"))
export class AlbumController extends BaseRestController {
    public constructor(@Inject() private albumService: AlbumService) {
        super();
    }

    @Post("/:bucketToken")
    @Returns(StatusCodes.OK, AlbumDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Create a new album in this bucket")
    @Summary("Create a new album")
    public createAlbum(
        @Description("The name of the album, must be unique")
        @Required()
        @BodyParams("name")
        albumName: string,

        @Description("The bucket token to associate the album with")
        @PathParams("bucketToken")
        bucketToken: string,
    ): Promise<AlbumModel> {
        return this.albumService.createAlbum(albumName, bucketToken);
    }

    @Post("/:albumToken/associate")
    @Returns(StatusCodes.OK, AlbumDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description(
        "Associate files with an album, the album must exist and the files must be in the same bucket as the album",
    )
    @Summary("Associate a file with an album")
    public associateFileWithAlbum(
        @Description("The album token to associate the file with")
        @PathParams("albumToken")
        albumToken: string,

        @Description("The file token to associate to the album")
        @BodyParams("fileTokens")
        @CollectionOf(String)
        fileTokens: string[],
    ): Promise<AlbumModel> {
        return this.albumService.assignFilesToAlbum(albumToken, fileTokens);
    }

    @Delete("/:albumToken")
    @Returns(StatusCodes.OK, SuccessModel)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Delete an album")
    @Summary("Delete album")
    public async deleteAlbum(
        @Description("The album token to associate the file with")
        @PathParams("albumToken")
        albumToken: string,

        @Description("Delete files, if false then the files will remain in the bucket")
        @QueryParams("deleteFiles")
        @Default(false)
        @Optional()
        deleteFiles: boolean,

        @Res() res: PlatformResponse,
    ): Promise<PlatformResponse> {
        await this.albumService.deleteAlbum(albumToken, deleteFiles);
        return super.doSuccess(res, "album deleted");
    }

    @Get("/:albumToken")
    @Returns(StatusCodes.OK, AlbumDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Returns(StatusCodes.NOT_FOUND, DefaultRenderException)
    @Description("Get an album and all files associated with it")
    @Summary("Get full album")
    public async getAlbum(
        @Description("The album to get")
        @PathParams("albumToken")
        albumToken: string,
    ): Promise<AlbumModel> {
        const album = await this.albumService.getAlbum(albumToken);
        if (album.isPublicToken(albumToken)) {
            throw new BadRequest("Supplied token is not valid");
        }
        return album;
    }

    @Get("/public/:albumToken")
    @Returns(StatusCodes.OK, PublicAlbumDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Returns(StatusCodes.NOT_FOUND, DefaultRenderException)
    @Description("Get the public sharable view of an album")
    @Summary("Get an album in public view")
    public async getPublicAlbum(
        @Description("The album to get, this should be the public token")
        @PathParams("albumToken")
        albumToken: string,
    ): Promise<AlbumModel> {
        const album = await this.albumService.getAlbum(albumToken);
        if (!album.isShared) {
            throw new BadRequest("This album is not public");
        }
        if (!album.isPublicToken(albumToken)) {
            throw new BadRequest("Supplied token is not valid");
        }
        return album;
    }

    @Get("/share/:albumToken")
    @Returns(StatusCodes.OK, String)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Returns(StatusCodes.NOT_FOUND, DefaultRenderException)
    @Description("Share album, this returns a public URL to the album")
    @Summary("Share an album")
    public shareAlbum(
        @Description("The private token to the album")
        @Required()
        @PathParams("albumToken")
        albumToken: string,
    ): Promise<string> {
        return this.albumService.shareAlbum(albumToken);
    }

    @Get("/revoke/:albumToken")
    @Returns(StatusCodes.OK, PlatformResponse)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Returns(StatusCodes.NOT_FOUND, DefaultRenderException)
    @Description(
        "Revoke (unshare) a shared album, this will invalidate the URL and your album will no longer be publicly accessible",
    )
    @Summary("Revoke a shared album")
    public async revokeShare(
        @Description("The private token to the album")
        @Required()
        @PathParams("albumToken")
        albumToken: string,

        @Res() res: PlatformResponse,
    ): Promise<PlatformResponse> {
        await this.albumService.revokeShare(albumToken);
        return super.doSuccess(res, "album unshared");
    }

    @Post("/download/:albumToken")
    @Returns(StatusCodes.OK, Buffer)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Returns(StatusCodes.NOT_FOUND, DefaultRenderException)
    @Description("Download files from an album as a zip")
    @Summary("Download files")
    public async downloadFiles(
        @Description("the public token to the album")
        @Required()
        @PathParams("albumToken")
        albumToken: string,

        @Description("The files to download, if empty then all files will be downloaded")
        @BodyParams()
        @CollectionOf(Number)
        fileIds: number[],

        @Res() res: PlatformResponse,
    ): Promise<Buffer> {
        const b = await this.albumService.downloadFiles(albumToken, fileIds);
        res.attachment("files.zip");
        res.contentType("application/zip");
        return b;
    }
}
