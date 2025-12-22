import { constant as getFromEnv, Inject, Service } from "@tsed/di";
import { OnReady } from "@tsed/platform-http";
import { FileRepo } from "../db/repo/FileRepo.js";
import { filesDir, FileUtils } from "../utils/Utils.js";
import fs from "node:fs/promises";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { FileService } from "./FileService.js";
import { RunEvery } from "../model/di/decorators/RunEvery.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";

@Service()
export class FileCleaner implements OnReady {
    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private fileUploadService: FileService,
    ) {}

    public async processFiles(): Promise<void> {
        const allFiles = await this.repo.getExpiredFiles();
        if (allFiles.length === 0) {
            return;
        }
        await this.fileUploadService.processDelete(allFiles.map(entry => entry.token));
    }

    @RunEvery(() => getFromEnv(GlobalEnv.FILE_CLEANER_CRON, "0 * * * *"))
    public async $onReady(): Promise<void> {
        await this.processFiles();
        await this.sync();
        await this.removeDupes();
    }

    @RunEvery("* * * * *")
    private async checkForDuplicateFiles(): Promise<void> {
        await this.removeDupes();
    }

    private async sync(): Promise<void> {
        const allFilesFromDb = await this.repo.getAllEntries();
        const allFilesFromSystem = await fs.readdir(filesDir);

        // Delete files from disk that aren't in DB
        const deleteFilesPromises = allFilesFromSystem
            .filter(fileOnSystem => !this.isFileInDb(allFilesFromDb, fileOnSystem))
            .map(fileToDelete => FileUtils.deleteFile(fileToDelete, true, true));

        // Delete DB entries for files that don't exist on disk
        const orphanedDbEntries = allFilesFromDb
            .filter(dbFile => !allFilesFromSystem.includes(dbFile.fullFileNameOnSystem))
            .map(entry => entry.token);

        await Promise.all([
            ...deleteFilesPromises,
            orphanedDbEntries.length > 0 ? this.fileUploadService.processDelete(orphanedDbEntries) : Promise.resolve(),
        ]);
    }

    private isFileInDb(fileDbList: FileUploadModel[], fileName: string): boolean {
        return !!fileDbList.find(file => file.fullFileNameOnSystem === fileName);
    }

    private async removeDupes(): Promise<void> {
        await this.repo.removeDuplicates();
    }
}
