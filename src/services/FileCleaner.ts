import { Constant, Inject, type OnInit, Service } from "@tsed/di";
import { FileRepo } from "../db/repo/FileRepo.js";
import { ScheduleService } from "./ScheduleService.js";
import { FileService } from "./FileService.js";
import { FileUtils } from "../utils/Utils.js";
import GlobalEnv from "../model/constants/GlobalEnv.js";

@Service()
export class FileCleaner implements OnInit {
    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private scheduleService: ScheduleService,
        @Inject() private fileUploadService: FileService,
    ) {}

    // default to every day at 12am
    @Constant(GlobalEnv.FILE_CLEANER_CRON, "0 * * * *")
    private readonly cronToRun: string;

    public async processFiles(): Promise<void> {
        const allFiles = await this.repo.getAllEntries();
        if (allFiles.length === 0) {
            return;
        }
        const expiredTokens = allFiles.filter(file => FileUtils.isFileExpired(file)).map(entry => entry.token);
        if (expiredTokens.length === 0) {
            return;
        }
        await this.fileUploadService.processDelete(expiredTokens);
    }

    public $onInit(): void {
        this.scheduleService.scheduleCronJob(this.cronToRun, this.processFiles, "removeExpiredFiles", this, true);
    }
}
