import { CollectionOf, Description, Name, Nullable, Property } from "@tsed/schema";
import { WaifuFile } from "./WaifuFile.js";
import { AlbumModel } from "../db/Album.model.js";
import { Builder } from "builder-pattern";
import { FileUtils } from "../../utils/Utils.js";
import { constant } from "@tsed/di";
import { FileUploadModel } from "../db/FileUpload.model.js";
import { GlobalEnv } from "../constants/GlobalEnv.js";
import { PublicAlbumMetadata } from "../../utils/typeings";

@Name("WaifuPublicFileMetadata")
@Description("Metadata about a public file in an album")
class WaifuPublicFileMetadata {
    @Property()
    @Description("The URL to the thumbnail of the file, if it is an image")
    @Name("thumbnail")
    @Nullable(String)
    public thumbnail: string | null;

    @Property()
    @Description("The media type of the file")
    @Name("mediaType")
    @Nullable(String)
    public mediaType: string | null;

    @Property()
    @Description("is the file a video")
    @Name("isVideo")
    public isVideo: boolean;
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

    @Property()
    @Description("The total size of all files in this album in bytes")
    @Name("totalSize")
    public totalSize: number;

    @Property()
    @Description("if the album is too big to download")
    @Name("albumTooBigToDownload")
    public albumTooBigToDownload: boolean;

    @Property()
    @Description("The album thumbnail")
    @Name("albumThumb")
    public albumThumb: string;

    public static fromModel(model: AlbumModel, metadata: PublicAlbumMetadata): PublicAlbumDto {
        const fileDtos = this.filesToDto(model);

        return Builder(PublicAlbumDto)
            .name(model.name)
            .files(fileDtos)
            .albumTooBigToDownload(metadata.albumTooBigToDownload)
            .totalSize(metadata.totalSize)
            .albumThumb(metadata.albumThumb)
            .build();
    }

    public static filesToDto(model: AlbumModel): WaifuPublicFile[] {
        return model.files
            ? model.files.map(f => {
                  const { url, options } = WaifuFile.fromModel(f, true);
                  const metadata = Builder(WaifuPublicFileMetadata)
                      .thumbnail(PublicAlbumDto.getThumbnail(model, f))
                      .mediaType(f.mediaType)
                      .isVideo(FileUtils.isVideo(f))
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
    }

    private static getThumbnail(album: AlbumModel, file: FileUploadModel): string | null {
        if (!FileUtils.isValidForThumbnail(file)) {
            return null;
        }
        const baseUrl = constant(GlobalEnv.BASE_URL) as string;
        return `${baseUrl}/rest/album/operations/${album.publicToken}/thumbnail?imageId=${file.id}`;
    }
}
