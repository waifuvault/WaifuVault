import { CollectionOf, Description, Name, Property } from "@tsed/schema";
import { BucketModel } from "../db/Bucket.model.js";
import { Builder } from "builder-pattern";
import { FileUploadResponseDto } from "./FileUploadResponseDto.js";
import { AlbumInfo } from "../rest/AlbumInfo.js";

@Name("WaifuBucket")
@Description("a bucket is a private collection of files, it can only be accessed by the creator")
export class BucketDto {
    @Property()
    @Description("The token of the bucket")
    @Name("token")
    public token: string;

    @Property()
    @Description("The files belonging to this bucket")
    @Name("files")
    @CollectionOf(FileUploadResponseDto)
    public files: FileUploadResponseDto[];

    @Property()
    @Description("All the albums in this bucket")
    @CollectionOf(AlbumInfo)
    public albums: AlbumInfo[];

    public static async fromModel(model: BucketModel): Promise<BucketDto> {
        const fileDtos = model.files
            ? await Promise.all(model.files.map(f => FileUploadResponseDto.fromModel(f, false, true))) // albums in files are resolved here in the query, so no lazy loading is done
            : [];
        const albums = model.albums ? model.albums.map(a => AlbumInfo.fromModel(a)) : [];
        return Builder(BucketDto).token(model.bucketToken).files(fileDtos).albums(albums).build();
    }
}
