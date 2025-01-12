import { CollectionOf, Description, Name, Nullable, Property, string } from "@tsed/schema";
import { FileUploadResponseDto } from "./FileUploadResponseDto.js";
import { AlbumModel } from "../db/Album.model.js";
import { Builder } from "builder-pattern";
import { FileUtils } from "../../utils/Utils.js";
import { constant } from "@tsed/di";
import GlobalEnv from "../constants/GlobalEnv.js";
import { FileUploadModel } from "../db/FileUpload.model.js";

@Name("WaifuPublicFileMetadata")
@Description("Meatadata about a public file in an album")
class WaifuPublicFileMetadata {
    @Property()
    @Description("The URL to the thumbnail of the file, if it is an image")
    @Name("thumbnail")
    @Nullable(string)
    public thumbnail: string | null;

    @Property()
    @Description("The media type of the file'")
    @Name("mediaType")
    @Nullable(string)
    public mediaType: string | null;
}

@Name("WaifuPublicFile")
@Description("This is a public file that belongs to an album")
class WaifuPublicFile {
    @Property()
    @Description("The Id of the file in this album")
    @Name("id")
    public id: number;

    @Property()
    @Description("The URL of the file")
    @Name("url")
    public url: string;

    @Property()
    @Description("The name of the file")
    @Name("name")
    public name: string;

    @Property()
    @Description("The file size in bytes")
    @Name("size")
    public size: number;

    @Property()
    @Description("If the file is protected or not")
    @Name("protected")
    public protected: boolean;

    @Property()
    @Description("additional metadata about the file")
    @Name("metadata")
    public metadata: WaifuPublicFileMetadata;
}

@Name("WaifuPublicAlbum")
@Description("A public album is a shared collection of files, it can be viewed by anyone")
export class PublicAlbumDto {
    @Property()
    @Description("The name of the album")
    @Name("name")
    public name: string;

    @Property()
    @Description("the files in this album")
    @Name("files")
    @CollectionOf(WaifuPublicFile)
    public files: WaifuPublicFile[];

    public static fromModel(model: AlbumModel): PublicAlbumDto {
        const fileDtos = model.files
            ? model.files.map(f => {
                  const { url, options } = FileUploadResponseDto.fromModel(f, true, false);
                  const metadata = Builder(WaifuPublicFileMetadata)
                      .thumbnail(PublicAlbumDto.getThumbnail(model, f))
                      .mediaType(f.mediaType)
                      .build();
                  return Builder(WaifuPublicFile)
                      .url(url)
                      .protected(options?.protected ?? false)
                      .name(f.parsedFileName)
                      .size(f.fileSize)
                      .id(f.id)
                      .metadata(metadata)
                      .build();
              })
            : [];
        return Builder(PublicAlbumDto).name(model.name).files(fileDtos).build();
    }

    private static getThumbnail(album: AlbumModel, file: FileUploadModel): string | null {
        if (!FileUtils.isImage(file)) {
            return null;
        }
        const baseUrl = constant(GlobalEnv.BASE_URL) as string;
        return `${baseUrl}/rest/album/operations/${album.publicToken}/thumbnail?imageId=${file.id}`;
    }
}
