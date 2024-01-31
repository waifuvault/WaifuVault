import {Constant, Inject, Service} from "@tsed/di";
import {FileRepo} from "../db/repo/FileRepo.js";
import {PlatformMulterFile} from "@tsed/common";
import {FileUploadModel} from "../model/db/FileUpload.model.js";
import {FileEngine} from "../engine/FileEngine.js";
import {FileUrlService} from "./FileUrlService.js";
import {MimeService} from "./MimeService.js";
import {Builder} from "builder-pattern";
import path from "path";
import fs from "node:fs/promises";
import crypto from "crypto";
import {FileUploadModelResponse} from "../model/rest/FileUploadModelResponse.js";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import {Logger} from "@tsed/logger";
import {XOR} from "../utils/typeings.js";
import {BadRequest} from "@tsed/exceptions";

@Service()
export class FileUploadService {

    @Inject()
    private repo: FileRepo;

    @Inject()
    private fileEngine: FileEngine;

    @Inject()
    private fileUrlService: FileUrlService;

    @Inject()
    private mimeService: MimeService;

    @Constant(GlobalEnv.BASE_URL)
    private readonly baseUrl: string;

    @Inject()
    private logger: Logger;

    public async processUpload(ip: string, source: XOR<PlatformMulterFile, string>): Promise<FileUploadModelResponse> {
        const token = crypto.randomUUID();
        const uploadEntry = Builder(FileUploadModel)
            .ip(ip)
            .token(token);
        let resourcePath: string;
        if (typeof source === "string") {
            const filePath = await this.fileUrlService.getFile(source);
            const fileName = path.basename(filePath);
            uploadEntry.fileName(fileName);
            resourcePath = filePath;
        } else {
            uploadEntry.fileName(source.filename);
            resourcePath = source.path;
        }

        await this.scanFile(resourcePath);
        await this.checkMime(resourcePath);

        const checksum = await this.getFileHash(resourcePath);
        const existingFileModels = await this.repo.getEntriesFromChecksum(checksum);
        const existingFileModel = existingFileModels.find(m => m.ip === ip);
        if (existingFileModel) {
            // ignore promise
            this.deleteUploadedFile(resourcePath);
            return FileUploadModelResponse.fromExistsUrl(existingFileModel, this.baseUrl);
        }
        uploadEntry.checksum(checksum);
        const savedEntry = await this.repo.saveEntry(uploadEntry.build());
        return FileUploadModelResponse.fromModel(savedEntry, this.baseUrl);
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
            throw new BadRequest("Failed to execute blocked file type check on item");
        }

        if (failedMime) {
            this.deleteUploadedFile(resourcePath);
            throw new BadRequest("Failed to store file due to blocked file type");
        }
    }

    public async processDelete(token: string): Promise<boolean> {
        let deleted = false;
        const entry = await this.repo.getEntry(token);
        if (!entry) {
            return false;
        }
        try {
            await this.fileEngine.deleteFile(entry.fileName);
            deleted = await this.repo.deleteEntry(token);
        } catch (e) {
            this.logger.error(e);
            return false;
        }
        return deleted;
    }

    private deleteUploadedFile(resource: string): Promise<void> {
        return this.fileEngine.deleteFile(path.basename(resource));
    }

}
