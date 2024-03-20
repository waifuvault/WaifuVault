import { Property } from "@tsed/schema";
import { Builder } from "builder-pattern";
import { FileEntryDto } from "./FileEntryDto.js";
import { FileUtils } from "../../utils/Utils.js";

export class StatsDto {
    @Property()
    public totalFileCount: number;

    @Property()
    public realFileCount: number;

    @Property()
    public totalFileSize: number;

    @Property()
    public entries: FileEntryDto[];

    public static async buildStats(entries: FileEntryDto[]): Promise<StatsDto> {
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
