import { constant as getFromEnv, Inject, Service } from "@tsed/di";
import { OnReady } from "@tsed/platform-http";
import { FileRepo } from "../db/repo/FileRepo.js";
import { FileService } from "./FileService.js";
import { StorageService } from "./StorageService.js";
import type { StorageBackend } from "../utils/typeings.js";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { RunEvery } from "../model/di/decorators/RunEvery.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";
import { Logger } from "@tsed/logger";
import { isSchedulerLeader } from "../utils/clusterUtils.js";

@Service()
export class FileCleaner implements OnReady {
    private static readonly syncGraceMs = 5 * 60 * 1000;
    private static readonly stagingGraceMs = 60 * 60 * 1000;

    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private fileUploadService: FileService,
        @Inject() private logger: Logger,
        @Inject() private storageService: StorageService,
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
        if (!isSchedulerLeader()) {
            return;
        }

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

        try {
            await this.storageService.sweepStaging(FileCleaner.stagingGraceMs);
        } catch (e) {
            this.logger.error(`Failed to sweep abandoned staged uploads: ${(e as Error).message}`);
        }
    }

    @RunEvery("* * * * *")
    private async checkForDuplicateFiles(): Promise<void> {
        if (!isSchedulerLeader()) {
            return;
        }

        await this.removeDupes();
    }

    private async sync(): Promise<void> {
        const allEntries = await this.repo.getAllEntries();
        for (const backend of this.storageService.backends) {
            await this.syncBackend(
                backend,
                allEntries.filter(entry => entry.storageBackend === backend),
            );
        }
    }

    private async syncBackend(backend: StorageBackend, allFilesFromDb: FileUploadModel[]): Promise<void> {
        const allFilesFromSystem: string[] = [];
        for await (const key of this.storageService.listKeys(backend)) {
            allFilesFromSystem.push(key);
        }

        const dbFileNames = new Set<string>();
        for (const dbFile of allFilesFromDb) {
            dbFileNames.add(dbFile.fullFileNameOnSystem);
        }
        const systemFileNames = new Set<string>(allFilesFromSystem);

        const orphanedOnDisk: string[] = [];
        for (const fileOnSystem of allFilesFromSystem) {
            if (dbFileNames.has(fileOnSystem)) {
                continue;
            }
            if (await this.wasRecentlyModified(backend, fileOnSystem)) {
                continue;
            }
            orphanedOnDisk.push(fileOnSystem);
        }

        for (const fileToDelete of orphanedOnDisk) {
            try {
                await this.storageService.deleteKeys(backend, [fileToDelete], true);
            } catch (e) {
                this.logger.error(`Failed to delete orphaned file ${fileToDelete}: ${(e as Error).message}`);
            }
        }

        // Delete DB entries for files that don't exist on disk
        const orphanedDbEntries = allFilesFromDb
            .filter(dbFile => !systemFileNames.has(dbFile.fullFileNameOnSystem))
            .map(entry => entry.token);

        if (orphanedDbEntries.length > 0) {
            try {
                await this.fileUploadService.processDelete(orphanedDbEntries);
            } catch (e) {
                this.logger.error(`Failed to delete orphaned database entries: ${(e as Error).message}`);
            }
        }
    }

    private async wasRecentlyModified(backend: StorageBackend, fileName: string): Promise<boolean> {
        const info = await this.storageService.headKey(backend, fileName);
        if (!info) {
            return false;
        }
        return Date.now() - info.lastModified.getTime() < FileCleaner.syncGraceMs;
    }

    private async removeDupes(): Promise<void> {
        await this.repo.removeDuplicates();
    }
}
