import { CollectionOf, Property } from "@tsed/schema";
import { Builder } from "builder-pattern";
import { AdminFileData } from "./AdminData.js";
import { FileUtils } from "../../utils/Utils.js";
import type { IpBlockedAwareFileEntry } from "../../utils/typeings.js";

export class StatsDto {
    @Property()
    public totalFileCount: number;

    @Property()
    public realFileCount: number;

    @Property()
    public totalFileSize: number;

    @Property()
    @CollectionOf(AdminFileData)
    public entries: AdminFileData[];

    public static async buildStats(entries: AdminFileData[]): Promise<StatsDto> {
        const realFiles = await FileUtils.getFilesCount();
        const fileSizes = entries.reduce((acc, currentValue) => acc + currentValue.fileSize, 0);
        const statsBuilder = Builder(StatsDto)
            .totalFileCount(entries.length)
            .realFileCount(realFiles)
            .totalFileSize(fileSizes)
            .entries(entries);
        return statsBuilder.build();
    }
}

export class StatsModel {
    @Property()
    public files: IpBlockedAwareFileEntry[];
}
