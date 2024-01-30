import {Constant, Inject, Service} from "@tsed/di";
import {FileRepo} from "../db/repo/FileRepo";
import {PlatformMulterFile} from "@tsed/common";
import {FileUploadModel} from "../model/db/FileUpload.model";
import {FileEngine} from "../engine/FileEngine";
import {FileUrlService} from "./FileUrlService";
import {Builder} from "builder-pattern";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import {FileUploadModelResponse} from "../model/rest/FileUploadModelResponse";
import GlobalEnv from "../model/constants/GlobalEnv";
import {Logger} from "@tsed/logger";
import {XOR} from "../utils/typeings";
import {BadRequest} from "@tsed/exceptions";

@Service()
export class FileUploadService {

    @Inject()
    private repo: FileRepo;

    @Inject()
    private fileEngine: FileEngine;

    @Inject()
    private fileUrlService: FileUrlService;

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

        const checksum = await this.getFileHash(resourcePath);
        const existingFileModel = await this.repo.getEntryFromChecksum(checksum);
        if (existingFileModel && ip === existingFileModel.ip) {
            // ignore promise
            this.deleteUploadedFile(resourcePath);
            return FileUploadModelResponse.fromExistsUrl(existingFileModel, this.baseUrl);
        }
        uploadEntry.checksum(checksum);
        const savedEntry = await this.repo.saveEntry(uploadEntry.build());
        return FileUploadModelResponse.fromModel(savedEntry, this.baseUrl);
    }

    private async getFileHash(resourcePath: string): Promise<string> {
        const fileBuffer = await fs.promises.readFile(resourcePath);
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
