import { CollectionOf, Description, Name, Property } from "@tsed/schema";
import { FileUploadResponseDto } from "./FileUploadResponseDto.js";
import { AlbumModel } from "../db/Album.model.js";
import { Builder } from "builder-pattern";
import { FileUtils } from "../../utils/Utils.js";
import { constant } from "@tsed/di";
import GlobalEnv from "../constants/GlobalEnv.js";
import { FileUploadModel } from "../db/FileUpload.model.js";

type FileMetadata = {
    thumbnail: string | null;
    mediaType: string | null;
};

@Name("WaifuPublicAlbum")
@Description("A public album is a shared collection of files, it can be viewed by anyone")
export class PublicAlbumDto {
    @Property()
    @Description("The name of the album")
    @Name("name")
    public name: string;

    @Property()
    @Description("The file urls belonging to this album")
    @Name("files")
    @CollectionOf(String)
    public files: {
        url: string;
        name: string;
        size: number;
        protected: boolean;
        id: number;
        metadata: FileMetadata;
    }[];

    public static fromModel(model: AlbumModel): PublicAlbumDto {
        const fileDtos = model.files
            ? model.files.map(f => {
                  const { url, options } = FileUploadResponseDto.fromModel(f, true, false);
                  const metadata: FileMetadata = {
                      thumbnail: PublicAlbumDto.getThumbnail(model, f),
                      mediaType: f.mediaType,
                  };
                  return {
                      url,
                      protected: options?.protected ?? false,
                      name: f.parsedFileName,
                      size: f.fileSize,
                      id: f.id,
                      metadata,
                  };
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
