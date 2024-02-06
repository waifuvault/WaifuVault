import {Constant, Inject, Service} from "@tsed/di";
import {FileRepo} from "../db/repo/FileRepo.js";
import type {PlatformMulterFile} from "@tsed/common";
import {FileUploadModel} from "../model/db/FileUpload.model.js";
import {FileEngine} from "../engine/FileEngine.js";
import {FileUrlService} from "./FileUrlService.js";
import {MimeService} from "./MimeService.js";
import {Builder, type IBuilder} from "builder-pattern";
import path from "path";
import fs from "node:fs/promises";
import crypto from "crypto";
import {FileUploadModelResponse} from "../model/rest/FileUploadModelResponse.js";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import {Logger} from "@tsed/logger";
import type {EntrySettings, XOR} from "../utils/typeings.js";
import {BadRequest, NotFound, UnsupportedMediaType} from "@tsed/exceptions";
import {FileUtils, ObjectUtils} from "../utils/Utils.js";
import TIME_UNIT from "../model/constants/TIME_UNIT.js";

@Service()
export class FileService {

    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private fileEngine: FileEngine,
        @Inject() private fileUrlService: FileUrlService,
        @Inject() private mimeService: MimeService,
        @Inject() private logger: Logger
    ) {
    }

    @Constant(GlobalEnv.BASE_URL)
    private readonly baseUrl: string;

    public async processUpload(ip: string, source: XOR<PlatformMulterFile, string>, expires?: string, maskFilename = false): Promise<FileUploadModelResponse> {
        const token = crypto.randomUUID();
        let originalFileName: string;
        const uploadEntry = Builder(FileUploadModel)
            .ip(ip)
            .token(token);
        let resourcePath: string;
        if (typeof source === "string") {
            const [filePath, originalFileNameRes] = await this.fileUrlService.getFile(source);
            resourcePath = filePath;
            originalFileName = originalFileNameRes;
        } else {
            resourcePath = source.path;
            originalFileName = source.originalname;
        }
        uploadEntry.fileName(path.parse(resourcePath).name);
        await this.scanFile(resourcePath);
        await this.checkMime(resourcePath);

        const fileSize = await this.fileEngine.getFileSize(path.basename(resourcePath));
        uploadEntry.fileSize(fileSize);
        const checksum = await this.getFileHash(resourcePath);
        const existingFileModels = await this.repo.getEntriesFromChecksum(checksum);
        const existingFileModel = existingFileModels.find(m => m.ip === ip);
        if (existingFileModel) {
            // ignore promise
            this.deleteUploadedFile(resourcePath);
            return FileUploadModelResponse.fromModel(existingFileModel, this.baseUrl, true);
        }

        uploadEntry.settings(this.buildEntrySettings(maskFilename));

        const ext = FileUtils.getExtension(originalFileName);
        if (ext) {
            uploadEntry.fileExtension(ext);
        }
        uploadEntry.originalFileName(originalFileName);
        uploadEntry.checksum(checksum);
        if (expires) {
            this.calculateCustomExpires(uploadEntry, expires);
        }
        const savedEntry = await this.repo.saveEntry(uploadEntry.build());

        return FileUploadModelResponse.fromModel(savedEntry, this.baseUrl, true);
    }

    private buildEntrySettings(hideFilename: boolean): EntrySettings {
        return {
            hideFilename
        };
    }

    public async getEntryFromFileName(fileNameOnSystem: string, requestedFileName: string): Promise<FileUploadModel> {
        const entry = await this.repo.getEntryFileName(fileNameOnSystem);
        if (entry === null || entry.originalFileName !== requestedFileName) {
            throw new NotFound(`resource ${requestedFileName} is not found`);
        }
        return entry;
    }

    public async getFileInfo(token: string, humanReadable: boolean): Promise<FileUploadModelResponse> {
        const entry = await this.repo.getEntry(token);
        if (!entry) {
            throw new BadRequest(`Unknown token ${token}`);
        }
        return FileUploadModelResponse.fromModel(entry, this.baseUrl, humanReadable);
    }

    public calculateCustomExpires(entry: IBuilder<FileUploadModel>, expires: string): void {
        let value: number = ObjectUtils.getNumber(expires);
        let timefactor: TIME_UNIT = TIME_UNIT.minutes;

        if (value === 0) {
            throw new BadRequest(`Unable to parse expire value from ${expires}`);
        }
        if (expires.includes('d')) {
            timefactor = TIME_UNIT.days;
        } else if (expires.includes('h')) {
            timefactor = TIME_UNIT.hours;
        }
        value = ObjectUtils.convertToMilli(value, timefactor);
        const maxExp: number = FileUtils.getTimeLeftBySize(entry.fileSize());

        if (value > maxExp) {
            throw new BadRequest(`Cannot extend time remaining beyond ${ObjectUtils.timeToHuman(maxExp)}`);
        }
        entry.customExpires(value);
    }

    public async processDelete(token: string): Promise<boolean> {
        let deleted = false;
        const entry = await this.repo.getEntry(token);
        if (!entry) {
            return false;
        }
        try {
            await this.fileEngine.deleteFile(entry.fullFileNameOnSystem, false);
            deleted = await this.repo.deleteEntry(token);
        } catch (e) {
            this.logger.error(e);
            return false;
        }
        return deleted;
    }

    private async getFileHash(resourcePath: string): Promise<string> {
        const fileBuffer = await fs.readFile(resourcePath);
        const hashSum = crypto.createHash('md5');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }

    private async scanFile(resourcePath: string): Promise<void> {
        let didPassAvScan = false;
        try {
            didPassAvScan = await this.fileEngine.scanFileWithClam(path.basename(resourcePath));
        } catch (e) {
            this.deleteUploadedFile(resourcePath);
            throw new BadRequest("Failed to execute AV scan on item");
        }

        if (!didPassAvScan) {
            this.deleteUploadedFile(resourcePath);
            throw new BadRequest("Failed to store file due to positive virus scan");
        }
    }

    private async checkMime(resourcePath: string): Promise<void> {
        let failedMime = false;
        try {
            failedMime = await this.mimeService.isBlocked(resourcePath);
        } catch (e) {
            this.deleteUploadedFile(resourcePath);
            throw e;
        }

        if (failedMime) {
            this.deleteUploadedFile(resourcePath);
            throw new UnsupportedMediaType(`MIME type not supported`);
        }
    }

    private deleteUploadedFile(resource: string): Promise<void> {
        return this.fileEngine.deleteFile(path.basename(resource));
    }

}
