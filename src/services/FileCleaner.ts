import {Constant, Inject, type OnInit, Service} from "@tsed/di";
import {FileRepo} from "../db/repo/FileRepo.js";
import {ScheduleService} from "./ScheduleService.js";
import {FileService} from "./FileService.js";
import {FileUtils} from "../utils/Utils.js";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import {Logger} from "@tsed/logger";

@Service()
export class FileCleaner implements OnInit {

    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private scheduleService: ScheduleService,
        @Inject() private fileUploadService: FileService,
        @Inject() private logger: Logger
    ) {
    }

    // default to every hour
    @Constant(GlobalEnv.FILE_CLEANER_CRON, "0 * * * *")
    private readonly cronToRun: string;

    public async processFiles(): Promise<void> {
        const allFiles = await this.repo.getAllEntries();
        if (allFiles.length === 0) {
            return;
        }
        const isExpiredPArr = allFiles.filter(file => FileUtils.isFileExpired(file));
        if (isExpiredPArr.length === 0) {
            return;
        }
        const deletePArr = isExpiredPArr.map(file => this.fileUploadService.processDelete([file.token]));
        await Promise.all(deletePArr);
    }

    public $onInit(): void {
        this.scheduleService.scheduleCronJob(this.cronToRun, this.processFiles, "removeExpiredFiles", this, true);
    }

}
