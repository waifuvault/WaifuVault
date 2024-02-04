import {Inject, type OnInit, Service} from "@tsed/di";
import {FileRepo} from "../db/repo/FileRepo.js";
import {ScheduleService} from "./ScheduleService.js";
import {FileUploadService} from "./FileUploadService.js";
import {FileUtils} from "../utils/Utils.js";

@Service()
export class FileCleaner implements OnInit {

    @Inject()
    private repo: FileRepo;

    @Inject()
    private scheduleService: ScheduleService;

    @Inject()
    private fileUploadService: FileUploadService;

    public async processFiles(): Promise<void> {
        const allFiles = await this.repo.getAllEntries();
        if (allFiles.length === 0) {
            return;
        }
        const isExpiredPArr = allFiles.filter(file => FileUtils.isFileExpired(file));
        if (isExpiredPArr.length === 0) {
            return;
        }
        const deletePArr = isExpiredPArr.map(file => this.fileUploadService.processDelete(file.token));
        await Promise.all(deletePArr);
    }

    public $onInit(): void {
        this.scheduleService.scheduleJobInterval({
            hours: 1,
            runImmediately: true
        }, this.processFiles, "removeExpiredFiles", this);
    }

}
