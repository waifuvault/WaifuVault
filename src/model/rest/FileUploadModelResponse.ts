import {Description, Nullable, Property} from "@tsed/schema";
import {FileUploadModel} from "../db/FileUpload.model.js";
import {Builder} from "builder-pattern";
import {ObjectUtils} from "../../utils/Utils.js";

export class FileUploadModelResponse {

    @Property()
    @Description("Used for file info and deleting")
    public token: string;

    @Property()
    @Description("Location of the uploaded file")
    public url: string;

    @Property()
    // @Any("string", "number")
    @Description("How long this file will exist for")
    @Nullable(Number, String)
    public retentionPeriod: string | number | null = null;

    public static fromModel(fileUploadModel: FileUploadModel, baseUrl: string, format = false): FileUploadModelResponse {
        const builder = Builder(FileUploadModelResponse)
            .token(fileUploadModel.token)
            .url(`${baseUrl}/f/${fileUploadModel.fileName}`);
        if (format) {
            builder.retentionPeriod(ObjectUtils.timeToHuman(fileUploadModel.expiresIn));
        } else {
            builder.retentionPeriod(fileUploadModel.expiresIn);
        }
        return builder.build();
    }
}
