import { CollectionOf, Description, Name, Property } from "@tsed/schema";
import { BucketModel } from "../db/Bucket.model.js";
import { Builder } from "builder-pattern";
import { FileUploadResponseDto } from "./FileUploadResponseDto.js";

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

    public static fromModel(model: BucketModel, baseUrl: string): BucketDto {
        const fileDtos = model.files.map(f => FileUploadResponseDto.fromModel(f, baseUrl));
        return Builder(BucketDto).token(model.bucketToken).files(fileDtos).build();
    }
}
