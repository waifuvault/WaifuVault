import {Inject, OnInit, Service} from "@tsed/di";
import {FileRepo} from "../db/repo/FileRepo";
import {ScheduleService} from "./ScheduleService";
import {FileEngine} from "../engine/FileEngine";

@Service()
export class FileCleaner implements OnInit {

    private static readonly MIN_EXPIRATION = 30 * 24 * 60 * 60 * 1000;
    private static readonly MAX_EXPIRATION = 365 * 24 * 60 * 60 * 1000;
    @Inject()
    private repo: FileRepo;
    @Inject()
    private scheduleService: ScheduleService;
    @Inject()
    private fileEngine: FileEngine;

    public async processFiles(): Promise<void> {
        const allFiles = await this.repo.getAllEntries();
        const now = Date.now();
        const pArr = allFiles.map(entry => {
            const createdDate = entry.createdAt;
            // caculate if file needs to be deleted
            const toDelete = true;
            if (toDelete) {
                return this.fileEngine.deleteFile(entry.fileName);
            }
        });
        await Promise.all(pArr);
    }

    public $onInit(): void {
        this.scheduleService.scheduleJobInterval({
            days: 1,
            runImmediately: true
        }, this.processFiles, "removeExpiredFiles", this);
    }
}
