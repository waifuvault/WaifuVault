import { Property } from "@tsed/schema";
import { Builder } from "builder-pattern";
import { FileEntry } from "./FileEntry.js";
import { FileUtils } from "../../utils/Utils.js";

export class Stats {
    @Property()
    public totalFileCount: number;

    @Property()
    public realFileCount: number;

    @Property()
    public totalFileSize: number;

    @Property()
    public entries: FileEntry[];

    public static async buildStats(entries: FileEntry[]): Promise<Stats> {
        const realFiles = await FileUtils.getFilesCount();
        const fileSizes = entries.reduce((acc, currentValue) => acc + currentValue.fileSize, 0);
        const statsBuilder = Builder(Stats)
            .totalFileCount(entries.length)
            .realFileCount(realFiles)
            .totalFileSize(fileSizes)
            .entries(entries);
        return statsBuilder.build();
    }
}
