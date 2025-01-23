import { FileUploadModel } from "../db/FileUpload.model.js";
import { Property } from "@tsed/schema";
import { AlbumInfo } from "../rest/AlbumInfo.js";
import { BucketModel } from "../db/Bucket.model.js";
import { Builder } from "builder-pattern";
import { ObjectUtils } from "../../utils/Utils.js";

type UrlFileMixin = FileUploadModel & { url: string; parsedFilename: string; expiresString: string | null };

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
                    parsedFilename: f.parsedFileName,
                    expiresString: f.expiresIn ? ObjectUtils.timeToHuman(f.expiresIn) : null,
                } as UrlFileMixin;
            }) ?? [];
        const albums =
            model.albums?.map(a => AlbumInfo.fromModel(a)).sort((a, b) => a.dateCreated - b.dateCreated) ?? [];
        return Builder(AdminBucketDto).token(model.bucketToken).files(files).albums(albums).build();
    }
}
