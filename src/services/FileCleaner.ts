import { Constant, Inject, Service } from "@tsed/di";
import { OnReady } from "@tsed/common";
import { FileRepo } from "../db/repo/FileRepo.js";
import { ScheduleService } from "./ScheduleService.js";
import { filesDir, FileUtils } from "../utils/Utils.js";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import fs from "node:fs/promises";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { FileService } from "./FileService.js";

@Service()
export class FileCleaner implements OnReady {
    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private scheduleService: ScheduleService,
        @Inject() private fileUploadService: FileService,
    ) {}

    // default to every hour at :00
    @Constant(GlobalEnv.FILE_CLEANER_CRON, "0 * * * *")
    private readonly cronToRun: string;

    public async processFiles(): Promise<void> {
        const allFiles = await this.repo.getExpiredFiles();
        if (allFiles.length === 0) {
            return;
        }
        await this.fileUploadService.processDelete(allFiles.map(entry => entry.token));
    }

    public $onReady(): void {
        this.scheduleService.scheduleCronJob(
            this.cronToRun,
            async () => {
                await this.processFiles();
                await this.sync();
            },
            "removeExpiredFiles",
            this,
            true,
        );
    }

    private async sync(): Promise<void> {
        const allFilesFromDb = await this.repo.getAllEntries();
        const allFilesFromSystem = await fs.readdir(filesDir);
        const deleteFilesPromises = allFilesFromSystem
            .filter(fileOnSystem => !this.isFileInDb(allFilesFromDb, fileOnSystem))
            .map(fileToDelete => FileUtils.deleteFile(fileToDelete));
        await Promise.all(deleteFilesPromises);
    }

    private isFileInDb(fileDbList: FileUploadModel[], fileName: string): boolean {
        return !!fileDbList.find(file => file.fullFileNameOnSystem === fileName);
    }
}
