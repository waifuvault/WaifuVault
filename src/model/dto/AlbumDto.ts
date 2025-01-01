import { CollectionOf, Description, Name, Property } from "@tsed/schema";
import { FileUploadResponseDto } from "./FileUploadResponseDto.js";
import { AlbumModel } from "../db/Album.model.js";
import { Builder } from "builder-pattern";

@Name("WaifuAlbum")
@Description("An album is a public collection of files, it can be shared with others in a read-only fashion")
export class AlbumDto {
    @Property()
    @Description("The token of the album")
    @Name("token")
    public token: string;

    @Property()
    @Description("The token of the bucket")
    @Name("bucketToken")
    public bucketToken: string;

    @Property()
    @Description("The name of the album")
    @Name("name")
    public name: string;

    @Property()
    @Description("The files belonging to this album")
    @Name("files")
    @CollectionOf(FileUploadResponseDto)
    public files: FileUploadResponseDto[];

    public static fromModel(model: AlbumModel): AlbumDto {
        const fileDtos = model.files ? model.files.map(f => FileUploadResponseDto.fromModel(f, false, false)) : [];
        return Builder(AlbumDto)
            .token(model.albumToken)
            .bucketToken(model.bucketToken)
            .name(model.name)
            .files(fileDtos)
            .build();
    }
}
