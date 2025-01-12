import { CollectionOf, Description, Name, Property } from "@tsed/schema";
import { FileUploadResponseDto } from "./FileUploadResponseDto.js";
import { AlbumModel } from "../db/Album.model.js";
import { Builder } from "builder-pattern";

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
    }[];

    public static fromModel(model: AlbumModel): PublicAlbumDto {
        const fileDtos = model.files
            ? model.files.map(f => {
                  const { url, options } = FileUploadResponseDto.fromModel(f, true, false);
                  return {
                      url,
                      protected: options?.protected ?? false,
                      name: f.originalFileName,
                      size: f.fileSize,
                      id: f.id,
                  };
              })
            : [];
        return Builder(PublicAlbumDto).name(model.name).files(fileDtos).build();
    }
}
