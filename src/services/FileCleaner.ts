import {Constant, Inject, type OnInit, Service} from "@tsed/di";
import {FileRepo} from "../db/repo/FileRepo.js";
import {ScheduleService} from "./ScheduleService.js";
import {FileUploadModel} from "../model/db/FileUpload.model.js";
import fs from "node:fs/promises";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import {FileUploadService} from "./FileUploadService.js";
import {filesDir} from "../utils/Utils.js";

@Service()
export class FileCleaner implements OnInit {

    private static readonly MIN_EXPIRATION = 30 * 24 * 60 * 60 * 1000;
    private static readonly MAX_EXPIRATION = 365 * 24 * 60 * 60 * 1000;
    @Inject()
    private repo: FileRepo;
    @Inject()
    private scheduleService: ScheduleService;

    @Inject()
    private fileUploadService: FileUploadService;

    @Constant(GlobalEnv.FILE_SIZE_UPLOAD_LIMIT_MB)
    private readonly MAX_SIZE: string;


    public async processFiles(): Promise<void> {
        const allFiles = await this.repo.getAllEntries();
        if (allFiles.length === 0) {
            return;
        }
        const isExpiredPArr = allFiles.map(file => this.isFileExpired(file));
        const isExpiredArr = await Promise.all(isExpiredPArr);
        const expiredFiles = allFiles.filter((_, index) => isExpiredArr[index]);
        const deletePArr = expiredFiles.map(file => this.fileUploadService.processDelete(file.token));
        await Promise.all(deletePArr);
    }

    public $onInit(): void {
        this.scheduleService.scheduleJobInterval({
            hours: 1,
            runImmediately: true
        }, this.processFiles, "removeExpiredFiles", this);
    }

    private async isFileExpired(entry: FileUploadModel): Promise<boolean> {
        const fileSize = await this.getFileSize(`${filesDir}/${entry.fileName}`);
        const maxLifespan: number = Math.floor((FileCleaner.MIN_EXPIRATION - FileCleaner.MAX_EXPIRATION) * Math.pow((fileSize / (Number.parseInt(this.MAX_SIZE) * 1048576) - 1), 3));
        const currentEpoch: number = Date.now();
        const maxExpiration: number = maxLifespan + entry.updatedAt.getTime();
        return currentEpoch > maxExpiration;
    }

    private async getFileSize(filename: string): Promise<number> {
        const info = await fs.stat(filename);
        return info.size;
    }
}
