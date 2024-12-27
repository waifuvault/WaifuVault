import { BaseRestController } from "../BaseRestController.js";
import { Constant, Controller, Inject } from "@tsed/di";
import {
    CollectionOf,
    Default,
    Delete,
    Description,
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
import GlobalEnv from "../../../model/constants/GlobalEnv.js";

@Controller("/album")
@Description("API for CRUD operations of albums and associating files with them.")
@Name("Album management")
@(Returns(StatusCodes.FORBIDDEN, DefaultRenderException).Description("If your IP has been blocked"))
export class AlbumController extends BaseRestController {
    public constructor(@Inject() private albumService: AlbumService) {
        super();
    }

    @Constant(GlobalEnv.BASE_URL)
    private readonly baseUrl: string;

    @Post("/:bucketToken")
    @Returns(StatusCodes.OK, AlbumDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description("Create a new album in this bucket")
    @Summary("Create a new album")
    public async createAlbum(
        @Description("The name of the album, must be unique")
        @Required()
        @BodyParams("name")
        albumName: string,

        @Description("The bucket token to associate the album with")
        @PathParams("bucketToken")
        bucketToken: string,
    ): Promise<AlbumDto> {
        return AlbumDto.fromModel(await this.albumService.createAlbum(albumName, bucketToken), this.baseUrl);
    }

    @Post("/:albumToken/associate")
    @Returns(StatusCodes.OK, AlbumDto)
    @Returns(StatusCodes.BAD_REQUEST, DefaultRenderException)
    @Description(
        "Associate files with an album, the album must exist and the files must be in the same bucket as the album",
    )
    @Summary("Associate a file with an album")
    public async associateFileWithAlbum(
        @Description("The album token to associate the file with")
        @PathParams("albumToken")
        albumToken: string,

        @Description("The file token to associate to the album")
        @BodyParams("fileTokens")
        @CollectionOf(String)
        fileTokens: string[],
    ): Promise<AlbumDto> {
        return AlbumDto.fromModel(await this.albumService.assignFilesToAlbum(albumToken, fileTokens), this.baseUrl);
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
}
