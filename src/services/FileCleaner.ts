import { constant as getFromEnv, Inject, Service } from "@tsed/di";
import { OnReady } from "@tsed/platform-http";
import { FileRepo } from "../db/repo/FileRepo.js";
import { filesDir, FileUtils } from "../utils/Utils.js";
import fs from "node:fs/promises";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { FileService } from "./FileService.js";
import { RunEvery } from "../model/di/decorators/RunEvery.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";
import { Logger } from "@tsed/logger";

@Service()
export class FileCleaner implements OnReady {
    private static readonly syncGraceMs = 5 * 60 * 1000;

    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private fileUploadService: FileService,
        @Inject() private logger: Logger,
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
        try {
            await this.processFiles();
        } catch (e) {
            this.logger.error(`Failed to process expired files: ${(e as Error).message}`);
        }

        try {
            await this.sync();
        } catch (e) {
            this.logger.error(`Failed to sync files with the database: ${(e as Error).message}`);
        }

        try {
            await this.removeDupes();
        } catch (e) {
            this.logger.error(`Failed to remove duplicate files: ${(e as Error).message}`);
        }
    }

    @RunEvery("* * * * *")
    private async checkForDuplicateFiles(): Promise<void> {
        await this.removeDupes();
    }

    private async sync(): Promise<void> {
        const allFilesFromDb = await this.repo.getAllEntries();
        const allFilesFromSystem = await fs.readdir(filesDir);

        const orphanedOnDisk: string[] = [];
        for (const fileOnSystem of allFilesFromSystem) {
            if (this.isFileInDb(allFilesFromDb, fileOnSystem)) {
                continue;
            }
            if (await this.wasRecentlyModified(fileOnSystem)) {
                continue;
            }
            orphanedOnDisk.push(fileOnSystem);
        }

        for (const fileToDelete of orphanedOnDisk) {
            try {
                await FileUtils.deleteFile(fileToDelete, true, true);
            } catch (e) {
                this.logger.error(`Failed to delete orphaned file ${fileToDelete}: ${(e as Error).message}`);
            }
        }

        // Delete DB entries for files that don't exist on disk
        const orphanedDbEntries = allFilesFromDb
            .filter(dbFile => !allFilesFromSystem.includes(dbFile.fullFileNameOnSystem))
            .map(entry => entry.token);

        if (orphanedDbEntries.length > 0) {
            try {
                await this.fileUploadService.processDelete(orphanedDbEntries);
            } catch (e) {
                this.logger.error(`Failed to delete orphaned database entries: ${(e as Error).message}`);
            }
        }
    }

    private isFileInDb(fileDbList: FileUploadModel[], fileName: string): boolean {
        return !!fileDbList.find(file => file.fullFileNameOnSystem === fileName);
    }

    private async wasRecentlyModified(fileName: string): Promise<boolean> {
        try {
            const stat = await fs.stat(`${filesDir}/${fileName}`);
            return Date.now() - stat.mtimeMs < FileCleaner.syncGraceMs;
        } catch {
            return false;
        }
    }

    private async removeDupes(): Promise<void> {
        await this.repo.removeDuplicates();
    }
}
