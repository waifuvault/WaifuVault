import { Description, Name, Nullable, Property } from "@tsed/schema";
import { FileUploadModel } from "../db/FileUpload.model.js";
import { Builder } from "builder-pattern";
import { ObjectUtils } from "../../utils/Utils.js";

@Name("WaifuResponse")
@Description("This is a standard response for the service, containing info about the entry")
export class FileUploadResponseDto {
    @Property()
    @Description("Used for file info and deleting")
    public token: string;

    @Property()
    @Description("Location of the uploaded file")
    public url: string;

    @Property()
    @Description("Does this file require a password")
    public protected: boolean;

    @Property()
    @Description("How long this file will exist for")
    @Nullable(Number, String)
    public retentionPeriod: string | number | null = null;

    public static fromModel(fileUploadModel: FileUploadModel, baseUrl: string, format = false): FileUploadResponseDto {
        const builder = Builder(FileUploadResponseDto)
            .token(fileUploadModel.token)
            .url(FileUploadResponseDto.getUrl(fileUploadModel, baseUrl));
        const expiresIn = fileUploadModel.expiresIn;
        if (format && expiresIn !== null) {
            builder.retentionPeriod(ObjectUtils.timeToHuman(expiresIn));
        } else {
            builder.retentionPeriod(fileUploadModel.expiresIn);
        }
        builder.protected(!!fileUploadModel.settings?.password);
        return builder.build();
    }

    private static getUrl(fileUploadModel: FileUploadModel, baseUrl: string): string {
        if (fileUploadModel.settings?.hideFilename || !fileUploadModel.originalFileName) {
            return `${baseUrl}/f/${fileUploadModel.fullFileNameOnSystem}`;
        }
        let { originalFileName } = fileUploadModel;
        if (originalFileName.startsWith("/")) {
            originalFileName = originalFileName.substring(1);
        }
        return `${baseUrl}/f/${fileUploadModel.fileName}/${originalFileName}`;
    }
}
