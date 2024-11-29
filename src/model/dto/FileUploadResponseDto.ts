import { Default, Description, Name, Nullable, Property } from "@tsed/schema";
import { FileUploadModel } from "../db/FileUpload.model.js";
import { Builder } from "builder-pattern";
import { ObjectUtils } from "../../utils/Utils.js";
import { EntrySettings } from "../../utils/typeings.js";

class ResponseOptions implements Required<Omit<EntrySettings, "password">> {
    @Property(Boolean)
    @Description("If the filename is hidden")
    @Default(false)
    public hideFilename = false;

    @Property(Boolean)
    @Default(false)
    @Description("If this file will be deleted when it is accessed")
    public oneTimeDownload = false;

    @Property(Boolean)
    @Default(false)
    @Description("Does this file require a password")
    public protected = false;
}

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
    @Description("How many times this file was downloaded")
    public views: number;

    @Property()
    @Description("The bucket that this file belongs to")
    @Nullable(String)
    public bucket: string | null = null;

    @Property()
    @Description("How long this file will exist for")
    @Nullable(Number, String)
    @Default(Number)
    public retentionPeriod: string | number | null = null;

    @Property()
    @Description("The options for this entry")
    public options: ResponseOptions;

    public static fromModel(fileUploadModel: FileUploadModel, baseUrl: string, format = false): FileUploadResponseDto {
        const builder = Builder(FileUploadResponseDto)
            .token(fileUploadModel.token)
            .bucket(fileUploadModel.bucketToken ?? null)
            .views(fileUploadModel.views)
            .url(FileUploadResponseDto.getUrl(fileUploadModel, baseUrl));
        const expiresIn = fileUploadModel.expiresIn;
        if (format && expiresIn !== null) {
            builder.retentionPeriod(ObjectUtils.timeToHuman(expiresIn));
        } else {
            builder.retentionPeriod(fileUploadModel.expiresIn);
        }

        builder.options(FileUploadResponseDto.makeOptions(fileUploadModel.settings));
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

    private static makeOptions(settings: EntrySettings | null): ResponseOptions {
        const options = Builder(ResponseOptions);
        if (!settings) {
            return options.build();
        }
        options.oneTimeDownload(settings?.oneTimeDownload ?? false);
        options.hideFilename(settings?.hideFilename ?? false);
        options.protected(!!settings.password);

        return options.build();
    }
}
