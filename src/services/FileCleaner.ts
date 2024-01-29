import {Inject, OnInit, Service} from "@tsed/di";
import {FileRepo} from "../db/repo/FileRepo";
import {ScheduleService} from "./ScheduleService";
import {FileEngine} from "../engine/FileEngine";
import {FileUploadModel} from "../model/db/FileUpload.model";
import fs from "fs";

@Service()
export class FileCleaner implements OnInit {

    private static readonly MIN_EXPIRATION = 30 * 24 * 60 * 60 * 1000;
    private static readonly MAX_EXPIRATION = 365 * 24 * 60 * 60 * 1000;
    private static readonly MAX_FILE_SIZE : number = 512 * 1024 * 1024;

    @Inject()
    private repo: FileRepo;
    @Inject()
    private scheduleService: ScheduleService;
    @Inject()
    private fileEngine: FileEngine;

    public async processFiles(): Promise<void> {
        const allFiles = await this.repo.getAllEntries();
        const pArr = allFiles.map(entry => {
            if (this.isFileExpired(entry)) {
                return this.fileEngine.deleteFile(entry.fileName);
            }
        });
        await Promise.all(pArr);
    }

    private isFileExpired(entry:FileUploadModel):boolean {
        const maxLifespan:number =
            Math.floor((FileCleaner.MIN_EXPIRATION-FileCleaner.MAX_EXPIRATION) * Math.pow((this.getFileSize(entry.fileName)/FileCleaner.MAX_FILE_SIZE - 1),3));
        const currentEpoch:number = Date.now();
        const maxExpiration:number = maxLifespan + entry.updatedAt.getTime();
        return currentEpoch>maxExpiration;
    }

    private getFileSize(filename:string):number {
        const info = fs.statSync(filename);
        return info.size;
    }

    public $onInit(): void {
        this.scheduleService.scheduleJobInterval({
            days: 1,
            runImmediately: true
        }, this.processFiles, "removeExpiredFiles", this);
    }
}
