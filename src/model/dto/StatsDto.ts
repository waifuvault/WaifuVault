import { CollectionOf, Property } from "@tsed/schema";
import { Builder } from "builder-pattern";
import { AdminFileData } from "./AdminData.js";
import { FileUtils } from "../../utils/Utils.js";
import { IpBlockedAwareFileEntry } from "../../utils/typeings.js";

export class StatsDto {
    @Property()
    public totalFileCount: number;

    @Property()
    public realFileCount: number;

    @Property()
    public totalFileSize: number;

    @Property()
    public totalBuckets: number;

    @Property()
    public averageBucketSize: number;

    @Property()
    public totalAlbums: number;

    @Property()
    public averageAlbumSize: number;

    @Property()
    @CollectionOf(AdminFileData)
    public entries: AdminFileData[];

    public static async buildStats(entries: AdminFileData[]): Promise<StatsDto> {
        const realFiles = await FileUtils.getFilesCount();
        const fileSizes = entries.reduce((acc, currentValue) => acc + currentValue.fileSize, 0);
        const bucketSet = entries
            .map(e => e.bucket)
            .reduce((set, item) => {
                set.add(item ?? "");
                return set;
            }, new Set<string>());
        bucketSet.delete("");
        const bucketSizes = entries.filter(e => e.bucket).reduce((acc, currentValue) => acc + currentValue.fileSize, 0);
        const albumSet = entries
            .map(e => e.album)
            .reduce((set, item) => {
                set.add(item?.token ?? "");
                return set;
            }, new Set<string>());
        albumSet.delete("");
        const albumSizes = entries.filter(e => e.album).reduce((acc, currentValue) => acc + currentValue.fileSize, 0);

        const statsBuilder = Builder(StatsDto)
            .totalFileCount(entries.length)
            .realFileCount(realFiles)
            .totalFileSize(fileSizes)
            .totalBuckets(bucketSet.size)
            .averageBucketSize(Math.floor(bucketSizes / bucketSet.size))
            .totalAlbums(albumSet.size)
            .averageAlbumSize(Math.floor(albumSizes / albumSet.size))
            .entries(entries);
        return statsBuilder.build();
    }
}

export class StatsModel {
    @Property()
    public files: IpBlockedAwareFileEntry[];
}
