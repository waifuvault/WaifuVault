import { Nullable, Property } from "@tsed/schema";
import { Builder } from "builder-pattern";
import { ObjectUtils } from "../../utils/Utils.js";
import type { IpBlockedAwareFileEntry, ProtectionLevel } from "../../utils/typeings.js";
import { FileUploadModel } from "../db/FileUpload.model.js";

export class FileEntryDto {
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
    @Nullable(String)
    public mediaType: string | null = null;

    @Property()
    public fileProtectionLevel: ProtectionLevel;

    public static fromModel({ entry, ipBlocked }: IpBlockedAwareFileEntry, baseUrl: string): FileEntryDto {
        const fileEntryBuilder = Builder(FileEntryDto)
            .url(FileEntryDto.getUrl(entry, baseUrl))
            .fileExtension(entry.fileExtension)
            .createdAt(entry.createdAt)
            .id(entry.id)
            .originalFileName(entry.originalFileName)
            .fileSize(entry.fileSize)
            .fileName(entry.fileName)
            .mediaType(entry.mediaType)
            .ipBanned(ipBlocked)
            .fileProtectionLevel(entry.fileProtectionLevel)
            .ip(entry.ip);
        const expiresIn = entry.expiresIn;
        if (expiresIn !== null) {
            fileEntryBuilder.expires(ObjectUtils.timeToHuman(expiresIn));
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
