import {Constant, Inject, Service} from "@tsed/di";
import {FileRepo} from "../db/repo/FileRepo.js";
import type {PlatformMulterFile} from "@tsed/common";
import {FileUploadModel} from "../model/db/FileUpload.model.js";
import {FileEngine} from "../engine/impl/index.js";
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
import {BadRequest, InternalServerError, NotFound, UnsupportedMediaType} from "@tsed/exceptions";
import {FileUtils, ObjectUtils} from "../utils/Utils.js";
import TIME_UNIT from "../model/constants/TIME_UNIT.js";
import argon2 from "argon2";
import {AvManager} from "../manager/AvManager.js";
import {UserService} from "./UserService.js";
import {EncryptionService} from "./EncryptionService.js";

@Service()
export class FileService {

    @Constant(GlobalEnv.BASE_URL)
    private readonly baseUrl: string;

    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private fileEngine: FileEngine,
        @Inject() private fileUrlService: FileUrlService,
        @Inject() private mimeService: MimeService,
        @Inject() private logger: Logger,
        @Inject() private avManager: AvManager,
        @Inject() private userService: UserService,
        @Inject() private encryptionService: EncryptionService
    ) {
    }

    public async processUpload(
        ip: string,
        source: XOR<PlatformMulterFile, string>,
        customExpiry?: string,
        maskFilename = false,
        password?: string
    ): Promise<[FileUploadModelResponse, boolean]> {
        const token = crypto.randomUUID();
        const uploadEntry = Builder(FileUploadModel)
            .ip(ip)
            .token(token);

        const [resourcePath, originalFileName] = await this.determineResourcePathAndFileName(source);
        uploadEntry.fileName(path.parse(resourcePath).name);
        await this.scanFile(resourcePath);
        await this.checkMime(resourcePath);
        const mediaType = await this.mimeService.findMimeType(resourcePath);
        uploadEntry.mediaType(mediaType);
        const fileSize = await this.fileEngine.getFileSize(path.basename(resourcePath));
        uploadEntry.fileSize(fileSize);
        const checksum = await this.getFileHash(resourcePath);

        const existingFileModel = await this.handleExistingFileModel(resourcePath, checksum, ip);
        if (existingFileModel) {
            if (existingFileModel.hasExpired) {
                await this.processDelete([existingFileModel.token], true);
            } else {
                return [FileUploadModelResponse.fromModel(existingFileModel, this.baseUrl, true), true];
            }
        }

        uploadEntry.settings(await this.buildEntrySettings(maskFilename, password));

        const ext = FileUtils.getExtension(originalFileName);
        if (ext) {
            uploadEntry.fileExtension(ext);
        }
        uploadEntry.originalFileName(originalFileName);
        uploadEntry.checksum(checksum);
        if (customExpiry) {
            this.calculateCustomExpires(uploadEntry, customExpiry);
        } else {
            uploadEntry.expires(FileUtils.getExpiresBySize(fileSize));
        }

        if (password) {
            try {
                await this.encryptionService.encrypt(resourcePath, password);
            } catch (e) {
                await this.deleteUploadedFile(resourcePath);
                this.logger.error(e.message);
                throw new InternalServerError(e.message);
            }
        }

        const savedEntry = await this.repo.saveEntry(uploadEntry.build());

        return [FileUploadModelResponse.fromModel(savedEntry, this.baseUrl, true), false];
    }

    private hashPassword(password: string): Promise<string> {
        return argon2.hash(password);
    }

    private async determineResourcePathAndFileName(source: XOR<PlatformMulterFile, string>): Promise<[string, string]> {
        let resourcePath: string;
        let originalFileName: string;
        if (typeof source === "string") {
            const [filePath, originalFileNameRes] = await this.fileUrlService.getFile(source);
            resourcePath = filePath;
            originalFileName = originalFileNameRes;
        } else {
            resourcePath = source.path;
            originalFileName = source.originalname;
        }
        return [resourcePath, originalFileName];
    }

    private async handleExistingFileModel(resourcePath: string, checksum: string, ip: string): Promise<FileUploadModel | null> {
        const existingFileModels = await this.repo.getEntriesFromChecksum(checksum);
        const existingFileModel = existingFileModels.find(m => m.ip === ip);
        if (existingFileModel) {
            if (!existingFileModel.hasExpired) {
                await this.deleteUploadedFile(resourcePath);
            }
            return existingFileModel;
        }
        return null;
    }

    private async buildEntrySettings(hideFilename?: boolean, password?: string): Promise<EntrySettings | null> {
        const retObj: EntrySettings = {};
        if (password) {
            retObj["password"] = await this.hashPassword(password);
        }
        if (hideFilename) {
            retObj["hideFilename"] = hideFilename;
        }
        return Object.keys(retObj).length === 0 ? null : retObj;
    }

    public async requiresPassword(resource: string): Promise<boolean> {
        const entry = await this.repo.getEntryFileName(resource);
        if (!entry) {
            return false;
        }
        return !!entry.settings?.password;
    }


    public async getEntry(fileNameOnSystem: string, requestedFileName?: string, password?: string): Promise<Buffer> {
        const entry = await this.repo.getEntryFileName(path.parse(fileNameOnSystem).name);
        if (entry === null || requestedFileName && entry.originalFileName !== requestedFileName) {
            throw new NotFound(`resource ${requestedFileName} is not found`);
        }
        if (entry.hasExpired) {
            throw new NotFound(`Resource ${requestedFileName ?? fileNameOnSystem} is not found`);
        }
        return this.encryptionService.decrypt(entry, password);
    }

    public async getFileInfo(token: string, humanReadable: boolean): Promise<FileUploadModelResponse> {
        const foundEntries = await this.repo.getEntry([token]);
        if (foundEntries.length !== 1) {
            throw new BadRequest(`Unknown token ${token}`);
        }
        const entry = foundEntries[0];
        if (entry.hasExpired) {
            await this.processDelete([entry.token], true);
            throw new BadRequest(`Unknown token ${token}`);
        }
        return FileUploadModelResponse.fromModel(entry, this.baseUrl, humanReadable);
    }

    private calculateCustomExpires(entry: IBuilder<FileUploadModel>, expires: string): void {
        let value: number = ObjectUtils.getNumber(expires);
        let timeFactor: TIME_UNIT = TIME_UNIT.minutes;

        if (value === 0) {
            throw new BadRequest(`Unable to parse expire value from ${expires}`);
        }
        if (expires.includes('d')) {
            timeFactor = TIME_UNIT.days;
        } else if (expires.includes('h')) {
            timeFactor = TIME_UNIT.hours;
        }
        value = ObjectUtils.convertToMilli(value, timeFactor);
        const maxExp: number = FileUtils.getTimeLeftBySize(entry.fileSize());

        if (value > maxExp) {
            throw new BadRequest(`Cannot extend time remaining beyond ${ObjectUtils.timeToHuman(maxExp)}`);
        }
        entry.expires(Date.now() + value);
    }

    public async processDelete(tokens: string[], softDelete = false): Promise<boolean> {
        let deleted = false;
        const entries = await this.repo.getEntry(tokens);
        if (entries.length === 0) {
            return false;
        }

        const fileDeletePArr = entries.map(entry => {
            if (entry.hasExpired && softDelete) {
                this.fileEngine.deleteFile(entry.fullFileNameOnSystem, true);
                return Promise.reject("Entry does not exist");
            }
            this.fileEngine.deleteFile(entry.fullFileNameOnSystem, true);
        });
        try {
            await Promise.all(fileDeletePArr);
            deleted = await this.repo.deleteEntries(tokens);
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

    private scanFile(resourcePath: string): Promise<void> {
        return this.avManager.scanFile(resourcePath);
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
