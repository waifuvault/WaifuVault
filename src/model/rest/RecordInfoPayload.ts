import { Description, Name, Property } from "@tsed/schema";
import { FileRepo } from "../../db/repo/FileRepo.js";
import { Builder } from "builder-pattern";
import { ObjectUtils } from "../../utils/Utils.js";

@Name("WaifuFilesInfo")
export class RecordInfoPayload {
    @Description("The total number of files hosted")
    @Property()
    @Name("recordCount")
    public recordCount: number;

    @Description("the total size of all files hosted in human readable format")
    @Property()
    @Name("recordSize")
    public recordSize: string;

    public static async fromRepo(repo: FileRepo): Promise<RecordInfoPayload> {
        const recordCount = await repo.getRecordCount();
        const size = (await repo.getTotalFileSize()) ?? 0;
        return Builder(RecordInfoPayload)
            .recordCount(recordCount)
            .recordSize(ObjectUtils.humanFileSize(size, false, 2))
            .build();
    }
}
