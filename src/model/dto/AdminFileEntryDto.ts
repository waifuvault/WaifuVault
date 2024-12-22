import { Nullable, Property } from "@tsed/schema";
import { Builder } from "builder-pattern";
import { ObjectUtils } from "../../utils/Utils.js";
import type { IpBlockedAwareFileEntry, ProtectionLevel } from "../../utils/typeings.js";
import { FileUploadModel } from "../db/FileUpload.model.js";
import { AlbumInfo } from "../rest/AlbumInfo.js";

export class AdminFileEntryDto {
    @Property()
    public id: number;

    @Property()
    public fileName: string;

    @Property()
    @Nullable(String)
    public fileExtension: string | null = null;

    @Property()
    public originalFileName: string;

    @Property()
    public fileSize: number;

    @Property()
    public createdAt: Date;

    @Property()
    @Nullable(String)
    public expires: string | null = null;

    @Property()
    public url: string;

    @Property()
    public ip: string;

    @Property()
    public ipBanned: boolean;

    @Property()
    public oneTimeDownload: boolean;

    @Property()
    @Nullable(String)
    public mediaType: string | null = null;

    @Property()
    @Nullable(String)
    public bucket: string | null = null;

    @Property()
    public fileProtectionLevel: ProtectionLevel;

    @Property()
    public views: number;

    @Property()
    @Nullable(AlbumInfo)
    public album: AlbumInfo | null = null;

    public static async fromModel(
        { entry, ipBlocked }: IpBlockedAwareFileEntry,
        baseUrl: string,
    ): Promise<AdminFileEntryDto> {
        const fileEntryBuilder = Builder(AdminFileEntryDto)
            .url(AdminFileEntryDto.getUrl(entry, baseUrl))
            .fileExtension(entry.fileExtension)
            .createdAt(entry.createdAt)
            .id(entry.id)
            .originalFileName(entry.originalFileName)
            .fileSize(entry.fileSize)
            .fileName(entry.fileName)
            .mediaType(entry.mediaType)
            .ipBanned(ipBlocked)
            .oneTimeDownload(entry.settings?.oneTimeDownload ?? false)
            .fileProtectionLevel(entry.fileProtectionLevel)
            .ip(entry.ip)
            .views(entry.views)
            .bucket(entry.bucketToken);
        const expiresIn = entry.expiresIn;
        if (expiresIn !== null) {
            fileEntryBuilder.expires(ObjectUtils.timeToHuman(expiresIn));
        }

        // at this point, all albums should be loaded by the relation query
        const album = await entry.album;
        if (album) {
            fileEntryBuilder.album(AlbumInfo.fromModel(album));
        }
        return fileEntryBuilder.build();
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
