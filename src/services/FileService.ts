import { Constant, Inject, Service } from "@tsed/di";
import { FileRepo } from "../db/repo/FileRepo.js";
import type { PlatformMulterFile } from "@tsed/common";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { FileUrlService } from "./FileUrlService.js";
import { MimeService } from "./MimeService.js";
import { Builder, type IBuilder } from "builder-pattern";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { FileUploadResponseDto } from "../model/dto/FileUploadResponseDto.js";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { Logger } from "@tsed/logger";
import type { EntrySettings } from "../utils/typeings.js";
import { BadRequest, Exception, InternalServerError, NotFound, UnsupportedMediaType } from "@tsed/exceptions";
import { FileUtils, ObjectUtils } from "../utils/Utils.js";
import TimeUnit from "../model/constants/TimeUnit.js";
import argon2 from "argon2";
import { AvManager } from "../manager/AvManager.js";
import { EncryptionService } from "./EncryptionService.js";
import { RecordInfoSocket } from "./socket/RecordInfoSocket.js";
import { EntryModificationDto } from "../model/dto/EntryModificationDto.js";
import { FileUploadParameters } from "../model/rest/FileUploadParameters.js";
import { ProcessUploadException } from "../model/exceptions/ProcessUploadException.js";

@Service()
export class FileService {
    @Constant(GlobalEnv.BASE_URL)
    private readonly baseUrl: string;

    @Constant(GlobalEnv.UPLOAD_SECRET)
    private readonly secret?: string;

    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private fileUrlService: FileUrlService,
        @Inject() private mimeService: MimeService,
        @Inject() private logger: Logger,
        @Inject() private avManager: AvManager,
        @Inject() private encryptionService: EncryptionService,
        @Inject() private recordInfoSocket: RecordInfoSocket,
    ) {}

    public async processUpload(
        ip: string,
        source: PlatformMulterFile | string,
        { password, hideFilename, expires }: FileUploadParameters,
        secretToken?: string,
    ): Promise<[FileUploadResponseDto, boolean]> {
        let resourcePath: string | undefined;
        let originalFileName: string | undefined;
        try {
            const token = crypto.randomUUID();
            const uploadEntry = Builder(FileUploadModel).ip(ip).token(token);
            [resourcePath, originalFileName] = await this.determineResourcePathAndFileName(source);
            uploadEntry.fileName(path.parse(resourcePath).name);
            await this.scanFile(resourcePath);
            await this.checkMime(resourcePath);
            const mediaType = await this.mimeService.findMimeType(resourcePath);
            uploadEntry.mediaType(mediaType);
            const fileSize = await FileUtils.getFileSize(path.basename(resourcePath));
            uploadEntry.fileSize(fileSize);
            const checksum = await this.getFileHash(resourcePath);

            const existingFileModel = await this.handleExistingFileModel(resourcePath, checksum, ip);
            if (existingFileModel) {
                if (existingFileModel.hasExpired) {
                    await this.processDelete([existingFileModel.token], true);
                } else {
                    return [FileUploadResponseDto.fromModel(existingFileModel, this.baseUrl, true), true];
                }
            }

            uploadEntry.settings(await this.buildEntrySettings(hideFilename, password));

            const ext = FileUtils.getExtension(originalFileName);
            if (ext) {
                uploadEntry.fileExtension(ext);
            }
            uploadEntry.originalFileName(originalFileName);
            uploadEntry.checksum(checksum);
            if (expires) {
                this.calculateCustomExpires(uploadEntry, expires, secretToken);
            } else if (secretToken !== this.secret) {
                uploadEntry.expires(FileUtils.getExpiresBySize(fileSize));
            }

            if (password) {
                try {
                    const didEncrypt = await this.encryptionService.encrypt(resourcePath, password);
                    uploadEntry.encrypted(didEncrypt !== null);
                } catch (e) {
                    await this.deleteUploadedFile(resourcePath);
                    this.logger.error(e.message);
                    throw new InternalServerError(e.message);
                }
            }
            const savedEntry = await this.repo.saveEntry(uploadEntry.build());

            await this.recordInfoSocket.emit();

            return [FileUploadResponseDto.fromModel(savedEntry, this.baseUrl, true), false];
        } catch (e) {
            if (e instanceof Exception) {
                throw new ProcessUploadException(e.status, e.message, resourcePath, e);
            }
            throw e;
        }
    }

    private hashPassword(password: string): Promise<string> {
        return argon2.hash(password);
    }

    private async determineResourcePathAndFileName(source: PlatformMulterFile | string): Promise<[string, string]> {
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
        if (originalFileName.startsWith("/")) {
            originalFileName = originalFileName.substring(1);
        }
        return [resourcePath, originalFileName];
    }

    private async handleExistingFileModel(
        resourcePath: string,
        checksum: string,
        ip: string,
    ): Promise<FileUploadModel | null> {
        const existingFileModel = await this.repo.getEntryFromChecksumAndIp(checksum, ip);
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

    public async isFileEncrypted(resource: string): Promise<boolean> {
        const entry = await this.repo.getEntryFileName(resource);
        if (!entry) {
            return false;
        }
        return entry.encrypted;
    }

    public async requiresPassword(resource: string): Promise<boolean> {
        const entry = await this.repo.getEntryFileName(resource);
        if (!entry) {
            return false;
        }
        return !!entry.settings?.password;
    }

    public async getEntry(
        fileNameOnSystem: string,
        requestedFileName?: string,
        password?: string,
    ): Promise<[Buffer, FileUploadModel]> {
        const entry = await this.repo.getEntryFileName(fileNameOnSystem);
        const resource = requestedFileName ?? fileNameOnSystem;
        if (entry === null) {
            throw new NotFound(`resource ${resource} is not found`);
        }
        let { originalFileName } = entry;
        if (originalFileName.startsWith("/")) {
            originalFileName = originalFileName.substring(1);
        }
        if ((requestedFileName && originalFileName !== requestedFileName) || entry.hasExpired) {
            throw new NotFound(`resource ${resource} is not found`);
        }
        return Promise.all([this.encryptionService.decrypt(entry, password), entry]);
    }

    public async modifyEntry(token: string, dto: EntryModificationDto): Promise<FileUploadResponseDto> {
        const [entryToModify] = await this.repo.getEntry([token]);
        if (!entryToModify) {
            throw new BadRequest(`Unknown token ${token}`);
        }
        const builder = Builder(FileUploadModel, entryToModify);
        if (typeof dto.hideFilename === "boolean") {
            builder.settings({
                ...builder.settings(),
                hideFilename: dto.hideFilename,
            });
        }
        if (dto.password) {
            builder.settings({
                ...builder.settings(),
                password: await this.hashPassword(dto.password),
            });
            if (builder.encrypted()) {
                if (!dto.previousPassword) {
                    throw new BadRequest("You must supply 'previousPassword' to change the password");
                }
                await this.encryptionService.changePassword(dto.previousPassword, dto.password, entryToModify);
            } else {
                const didEncrypt = await this.encryptionService.encrypt(
                    FileUtils.getFilePath(entryToModify),
                    dto.password,
                );
                if (didEncrypt) {
                    builder.encrypted(true);
                }
            }
        } else if (dto.password === "") {
            if (builder.encrypted()) {
                if (!dto.previousPassword) {
                    throw new BadRequest("Unable to remove password if previousPassword is not supplied");
                }
                const decryptedEntry = await this.encryptionService.decrypt(entryToModify, dto.previousPassword);
                await fs.writeFile(FileUtils.getFilePath(entryToModify), decryptedEntry);
                builder.encrypted(false);
            }
            const newSettings = builder.settings();
            delete newSettings?.password;
            builder.settings(newSettings);
        }
        if (dto.customExpiry) {
            this.calculateCustomExpires(builder, dto.customExpiry);
        } else if (dto.customExpiry === "") {
            const fileSize = await FileUtils.getFileSize(entryToModify);
            builder.expires(FileUtils.getExpiresBySize(fileSize, entryToModify.createdAt.getTime()));
        }
        const updatedEntry = await this.repo.saveEntry(builder.build());
        return FileUploadResponseDto.fromModel(updatedEntry, this.baseUrl);
    }

    public async getFileInfo(token: string, humanReadable: boolean): Promise<FileUploadResponseDto> {
        const foundEntries = await this.repo.getEntry([token]);
        if (foundEntries.length !== 1) {
            throw new BadRequest(`Unknown token ${token}`);
        }
        const entry = foundEntries[0];
        if (entry.hasExpired) {
            await this.processDelete([entry.token], true);
            throw new BadRequest(`Unknown token ${token}`);
        }
        return FileUploadResponseDto.fromModel(entry, this.baseUrl, humanReadable);
    }

    private calculateCustomExpires(entry: IBuilder<FileUploadModel>, expires: string, secretToken?: string): void {
        let value: number = ObjectUtils.getNumber(expires);
        let timeFactor: TimeUnit = TimeUnit.minutes;

        if (value === 0) {
            throw new BadRequest(`Unable to parse expire value from ${expires}`);
        }
        if (expires.includes("d")) {
            timeFactor = TimeUnit.days;
        } else if (expires.includes("h")) {
            timeFactor = TimeUnit.hours;
        }
        value = ObjectUtils.convertToMilli(value, timeFactor);
        const maxExp: number | null =
            this.secret === secretToken ? null : FileUtils.getTimeLeftBySize(entry.fileSize());

        if (maxExp !== null && value > maxExp) {
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
                FileUtils.deleteFile(entry.fullFileNameOnSystem, true);
                return Promise.reject("Entry does not exist");
            }
            return FileUtils.deleteFile(entry.fullFileNameOnSystem, true);
        });
        try {
            await Promise.all(fileDeletePArr);
            deleted = await this.repo.deleteEntries(tokens);
        } catch (e) {
            this.logger.error(e);
            return false;
        }
        await this.recordInfoSocket.emit();
        return deleted;
    }

    private async getFileHash(resourcePath: string): Promise<string> {
        const fileBuffer = await fs.readFile(resourcePath);
        const hashSum = crypto.createHash("md5");
        hashSum.update(fileBuffer);
        return hashSum.digest("hex");
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
        return FileUtils.deleteFile(path.basename(resource));
    }
}
