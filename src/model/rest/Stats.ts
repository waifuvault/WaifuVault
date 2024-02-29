import {Property} from "@tsed/schema";
import {Builder} from "builder-pattern";
import {FileEntry} from "./FileEntry.js";

export class Stats {

    @Property()
    public totalFileCount: number;

    @Property()
    public totalFileSize: number;

    @Property()
    public entries: FileEntry[];

    public static buildStats(entries: FileEntry[]): Stats {
        const fileSizes = entries.reduce((acc, currentValue) => acc + currentValue.fileSize, 0);
        const statsBuilder = Builder(Stats)
            .totalFileCount(entries.length)
            .totalFileSize(fileSizes)
            .entries(entries);
        return statsBuilder.build();
    }
}