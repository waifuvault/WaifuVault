import { Property } from "@tsed/schema";
import { Builder } from "builder-pattern";
import { AdminFileEntryDto } from "./AdminFileEntryDto.js";
import { FileUtils } from "../../utils/Utils.js";

export class StatsDto {
    @Property()
    public totalFileCount: number;

    @Property()
    public realFileCount: number;

    @Property()
    public totalFileSize: number;

    @Property()
    public entries: AdminFileEntryDto[];

    public static async buildStats(entries: AdminFileEntryDto[]): Promise<StatsDto> {
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
