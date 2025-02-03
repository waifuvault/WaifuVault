import { Default, Description, Name, Nullable, Property } from "@tsed/schema";
import { FileUploadModel } from "../db/FileUpload.model.js";
import { Builder, IBuilder } from "builder-pattern";
import { ObjectUtils } from "../../utils/Utils.js";
import { EntrySettings } from "../../utils/typeings.js";
import { AlbumInfo } from "../rest/AlbumInfo.js";

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

@Name("WaifuFile")
@Description("This is a standard response for the service, containing info about the entry")
export class WaifuFile {
    @Property()
    @Description("Used for file info and deleting")
    public token: string;

    @Property()
    @Description("Location of the uploaded file")
    public url: string;

    @Property()
    @Description("The public ID of this file")
    public id: number;

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
    @Default(null)
    public retentionPeriod: string | number | null = null;

    @Property()
    @Description("The options for this entry")
    public options: ResponseOptions;

    public album: AlbumInfo | null = null;

    public static fromModel<T extends WaifuFile>(
        fileUploadModel: FileUploadModel,
        format: boolean,
        builderToUse?: IBuilder<T>,
    ): WaifuFile {
        let builder: IBuilder<T>;
        if (builderToUse) {
            builder = builderToUse;
        } else {
            builder = Builder<T>(WaifuFile as unknown as T);
        }
        builder
            .token(fileUploadModel.token)
            .id(fileUploadModel.id)
            .bucket(fileUploadModel.bucketToken ?? null)
            .views(fileUploadModel.views)
            .url(fileUploadModel.getPublicUrl());
        const expiresIn = fileUploadModel.expiresIn;
        if (format && expiresIn !== null) {
            builder.retentionPeriod(ObjectUtils.timeToHuman(expiresIn));
        } else {
            builder.retentionPeriod(fileUploadModel.expiresIn);
        }

        builder.options(WaifuFile.makeOptions(fileUploadModel.settings));
        return builder.build();
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

@Name("WaifuFileWithAlbum")
@Description("This is a standard response for the service, containing info about the entry and the album it belongs to")
export class WaifuFileWithAlbum extends WaifuFile {
    @Property()
    @Description("The album that this file belongs to")
    @Nullable(AlbumInfo)
    public override album: AlbumInfo | null = null;

    public static async fromModelAlbum(fileUploadModel: FileUploadModel, format: boolean): Promise<WaifuFileWithAlbum> {
        const album = await fileUploadModel.album;

        const builder = Builder(WaifuFileWithAlbum);
        if (album) {
            builder.album(AlbumInfo.fromModel(album));
        } else {
            builder.album(null);
        }
        return WaifuFile.fromModel(fileUploadModel, format, builder) as WaifuFileWithAlbum;
    }
}
