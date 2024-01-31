import {Nullable, Property} from "@tsed/schema";
import {FileUploadModel} from "../db/FileUpload.model.js";
import {Builder} from "builder-pattern";

export class FileUploadModelResponse {

    @Property()
    @Nullable(String)
    public token: string;

    @Property()
    public url: string;

    public static fromModel(fileUploadModel: FileUploadModel, baseUrl: string): FileUploadModelResponse {
        return Builder(FileUploadModelResponse).token(fileUploadModel.token).url(`${baseUrl}/f/${fileUploadModel.fileName}`).build();
    }

    public static fromExistsUrl(fileUploadModel: FileUploadModel, baseUrl: string): FileUploadModelResponse {
        return Builder(FileUploadModelResponse).url(`${baseUrl}/f/${fileUploadModel.fileName}`).build();
    }
}
