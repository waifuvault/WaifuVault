import { BaseRestController } from "../BaseRestController.js";
import { Controller, Inject } from "@tsed/di";
import { Description, Name, Post, Required, Returns, Summary } from "@tsed/schema";
import { StatusCodes } from "http-status-codes";
import { DefaultRenderException } from "../../../model/rest/DefaultRenderException.js";
import { AlbumDto } from "../../../model/dto/AlbumDto.js";
import { BodyParams } from "@tsed/platform-params";
import { PathParams } from "@tsed/common";
import { AlbumService } from "../../../services/AlbumService.js";

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
    ): Promise<AlbumDto> {
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
        fileTokens: string[],
    ): Promise<AlbumDto> {
        return this.albumService.assignFilesToAlbum(albumToken, fileTokens);
    }
}
