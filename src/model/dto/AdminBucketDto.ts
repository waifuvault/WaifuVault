import { FileUploadModel } from "../db/FileUpload.model.js";
import { Property } from "@tsed/schema";
import { AlbumInfo } from "../rest/AlbumInfo.js";
import { BucketModel } from "../db/Bucket.model.js";
import { Builder } from "builder-pattern";

type UrlFileMixin = FileUploadModel & { url: string };

export class AdminBucketDto {
    @Property()
    public token: string;

    @Property()
    public files: UrlFileMixin[];

    @Property()
    public albums: AlbumInfo[];

    public static fromModel(model: BucketModel): AdminBucketDto {
        const files =
            model?.files?.map(f => {
                return {
                    ...f,
                    url: f.getPublicUrl(),
                } as UrlFileMixin;
            }) ?? [];
        const albums = model.albums?.map(a => AlbumInfo.fromModel(a)) ?? [];
        return Builder(AdminBucketDto).token(model.bucketToken).files(files).albums(albums).build();
    }
}
