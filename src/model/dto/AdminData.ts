import { CollectionOf, Nullable, Property } from "@tsed/schema";
import type { AdminDataTaleEntryModel, IpBlockedAwareFileEntry, ProtectionLevel } from "../../utils/typeings.js";
import { AlbumInfo } from "../rest/AlbumInfo.js";
import { Builder } from "builder-pattern";
import { ObjectUtils } from "../../utils/Utils.js";

export class AdminFileData {
    @Property()
    public id: number;

    @Property()
    public addedToAlbumOrder: number;

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
    @Nullable(String)
    public ip: string | null = null;

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
    public fileToken: string;

    @Property()
    public fileProtectionLevel: ProtectionLevel;

    @Property()
    public views: number;

    @Property()
    @Nullable(AlbumInfo)
    public album: AlbumInfo | null = null;

    public static async fromModel({ entry, ipBlocked }: IpBlockedAwareFileEntry): Promise<AdminFileData> {
        const fileEntryBuilder = Builder(AdminFileData)
            .url(entry.getPublicUrl())
            .fileExtension(entry.fileExtension)
            .createdAt(entry.createdAt)
            .id(entry.id)
            .addedToAlbumOrder(entry.addedToAlbumOrder ?? 0)
            .originalFileName(entry.originalFileName)
            .fileSize(entry.fileSize)
            .fileName(entry.fileName)
            .mediaType(entry.mediaType)
            .ipBanned(ipBlocked)
            .oneTimeDownload(entry.settings?.oneTimeDownload ?? false)
            .fileProtectionLevel(entry.fileProtectionLevel)
            .ip(entry.ip)
            .views(entry.views)
            .bucket(entry.bucketToken)
            .fileToken(entry.token);
        const expiresIn = entry.expiresIn;
        if (expiresIn !== null) {
            fileEntryBuilder.expires(ObjectUtils.timeToHuman(expiresIn));
        }

        const album = await entry.album;
        if (album) {
            fileEntryBuilder.album(AlbumInfo.fromModel(album));
        }
        return fileEntryBuilder.build();
    }
}

export class AdminData {
    @Property()
    public draw: number;

    @Property()
    public recordsTotal: number;

    @Property()
    public recordsFiltered: number;

    @Property()
    @CollectionOf(AdminFileData)
    public data: AdminFileData[];

    public static async fromModel({
        data,
        recordsFiltered,
        recordsTotal,
        draw,
    }: AdminDataTaleEntryModel): Promise<AdminData> {
        const adminFileData = await Promise.all(data.map(entry => AdminFileData.fromModel(entry)));
        return Builder(AdminData)
            .draw(draw)
            .data(adminFileData)
            .recordsFiltered(recordsFiltered)
            .recordsTotal(recordsTotal)
            .build();
    }
}
