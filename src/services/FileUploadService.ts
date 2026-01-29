import { Inject, Service } from "@tsed/di";
import { FileRepo } from "../db/repo/FileRepo.js";
import { type PlatformMulterFile } from "@tsed/platform-multer";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { FileUrlService } from "./FileUrlService.js";
import { Builder, type IBuilder } from "builder-pattern";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import crypto from "node:crypto";
import { Logger } from "@tsed/logger";
import { EntrySettings, FileUploadProps } from "../utils/typeings.js";
import { BadRequest, Exception, InternalServerError } from "@tsed/exceptions";
import { FileUtils, ObjectUtils } from "../utils/Utils.js";
import TimeUnit from "../model/constants/TimeUnit.js";
import argon2 from "argon2";
import { EncryptionService } from "./EncryptionService.js";
import { RecordInfoSocket } from "./socket/RecordInfoSocket.js";
import { EntryModificationDto } from "../model/dto/EntryModificationDto.js";
import { FileUploadQueryParameters } from "../model/rest/FileUploadQueryParameters.js";
import { ProcessUploadException } from "../model/exceptions/ProcessUploadException.js";
import { FileService } from "./FileService.js";
import { BucketService } from "./BucketService.js";
import BucketType from "../model/constants/BucketType.js";
import { FileFilterManager } from "../manager/FileFilterManager.js";
import { MimeService } from "./MimeService.js";
import { uuid } from "../utils/uuidUtils.js";
import { SettingsService } from "./SettingsService.js";
import { GlobalEnv } from "../model/constants/GlobalEnv.js";
import { FileReputationService } from "./FileReputationService.js";

@Service()
export class FileUploadService {
    private readonly secret: string | null;
    private readonly vtApiKey: string | null;
    private readonly dangerousMimeTypes: string | null;
    private readonly maxFileSize: number;

    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private fileUrlService: FileUrlService,
        @Inject() private mimeService: MimeService,
        @Inject() private logger: Logger,
        @Inject() private encryptionService: EncryptionService,
        @Inject() private recordInfoSocket: RecordInfoSocket,
        @Inject() private fileService: FileService,
        @Inject() private bucketService: BucketService,
        @Inject() private fileFilterManager: FileFilterManager,
        @Inject() private fileReputationService: FileReputationService,
        @Inject() settingsService: SettingsService,
    ) {
        this.secret = settingsService.getSetting(GlobalEnv.UPLOAD_SECRET);
        this.vtApiKey = settingsService.getSetting(GlobalEnv.VIRUSTOTAL_KEY);
        this.dangerousMimeTypes = settingsService.getSetting(GlobalEnv.DANGEROUS_MIME_TYPES);
        this.maxFileSize = settingsService.getMaxFileSize();
    }

    public async processUpload({
        ip,
        source,
        options,
        password,
        secretToken,
        bucketToken,
    }: FileUploadProps): Promise<[FileUploadModel, boolean]> {
        const { expires } = options;
        let resourcePath: string | undefined;
        let originalFileName: string | undefined;
        try {
            [resourcePath, originalFileName] = await this.determineResourcePathAndFileName(source);
            const checksum = await this.getFileHash(resourcePath);
            const existingFileModel = await this.handleExistingFileModel(resourcePath, checksum, ip, bucketToken);

            if (existingFileModel) {
                await FileUtils.deleteFile(path.basename(resourcePath), true);
                if (existingFileModel.hasExpired) {
                    await this.fileService.processDelete([existingFileModel.token]);
                } else {
                    return [existingFileModel, true];
                }
            }

            const token = uuid();
            const uploadEntry = Builder(FileUploadModel).ip(ip).token(token);

            await this.filterFile(source);

            uploadEntry.fileName(path.parse(resourcePath).name);
            const mediaType = await this.mimeService.findMimeType(resourcePath);
            uploadEntry.mediaType(mediaType);
            const fileSize = await FileUtils.getFileSize(path.basename(resourcePath));
            uploadEntry.fileSize(fileSize);

            if (bucketToken) {
                if (!(await this.bucketService.bucketExists(bucketToken))) {
                    throw new BadRequest(`Bucket with token ${bucketToken} does not exist`);
                }
                uploadEntry.bucketToken(bucketToken);
            } else {
                uploadEntry.bucketToken(null);
            }

            uploadEntry.settings(
                await this.buildEntrySettings({
                    password,
                    ...options,
                }),
            );

            const ext = FileUtils.getExtension(originalFileName);
            if (ext) {
                uploadEntry.fileExtension(ext);
            }
            uploadEntry.originalFileName(originalFileName);
            uploadEntry.checksum(checksum);

            await this.setExpires(uploadEntry, fileSize, secretToken, bucketToken, expires);

            if (password) {
                try {
                    const didEncrypt = await this.encryptionService.encrypt(resourcePath, password);
                    uploadEntry.encrypted(didEncrypt !== null);
                } catch (e) {
                    await FileUtils.deleteFile(resourcePath);
                    this.logger.error(e.message);
                    throw new InternalServerError(e.message);
                }
            }
            const savedEntry = await this.repo.saveEntry(uploadEntry.build());

            // Check if dangerous type and enqueue for scanning if so
            if (this.vtApiKey && this.dangerousMimeTypes) {
                if (this.dangerousMimeTypes.includes(mediaType ?? "")) {
                    this.fileReputationService.enqueueFile(savedEntry);
                }
            }

            await this.recordInfoSocket.emit();

            return [savedEntry, false];
        } catch (e) {
            if (e instanceof Exception) {
                throw new ProcessUploadException(e.status, e.message, resourcePath, e);
            }
            throw e;
        }
    }

    private async setExpires(
        entryBuilder: IBuilder<FileUploadModel>,
        fileSize: number,
        secretToken?: string,
        bucketToken?: string,
        customExpires?: string,
    ): Promise<void> {
        if (customExpires) {
            await this.calculateCustomExpires(entryBuilder, customExpires, secretToken, bucketToken);
        } else if (await this.hasUnlimitedExpire(secretToken, bucketToken)) {
            entryBuilder.expires(null);
        } else {
            entryBuilder.expires(FileUtils.getExpiresBySize(fileSize, this.maxFileSize));
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
            originalFileName = Buffer.from(source.originalname, "latin1").toString("utf8");
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
        bucket?: string,
    ): Promise<FileUploadModel | null> {
        const existingFileModels = await this.repo.getEntriesFromChecksum(checksum, bucket);
        if (existingFileModels.length === 0) {
            return null;
        }

        let existingFileModel: FileUploadModel | undefined;
        if (bucket) {
            existingFileModel = existingFileModels[0];
        } else {
            existingFileModel = existingFileModels.find(m => m.ip === ip);
        }

        if (existingFileModel) {
            if (!existingFileModel.hasExpired) {
                await FileUtils.deleteFile(resourcePath);
            }
            return existingFileModel;
        }
        return null;
    }

    private async buildEntrySettings({
        password,
        hideFilename,
        oneTimeDownload,
    }: FileUploadQueryParameters & { password?: string }): Promise<EntrySettings | null> {
        const retObj: EntrySettings = {};
        if (password) {
            retObj["password"] = await this.hashPassword(password);
        }
        if (hideFilename) {
            retObj["hideFilename"] = hideFilename;
        }
        if (oneTimeDownload) {
            retObj["oneTimeDownload"] = oneTimeDownload;
        }
        return Object.keys(retObj).length === 0 ? null : retObj;
    }

    public async modifyEntry(token: string, dto: EntryModificationDto): Promise<FileUploadModel> {
        const [entryToModify] = await this.repo.getEntries([token]);
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
            await this.calculateCustomExpires(builder, dto.customExpiry);
        } else if (dto.customExpiry === "") {
            const fileSize = await FileUtils.getFileSize(entryToModify);
            builder.expires(FileUtils.getExpiresBySize(fileSize, this.maxFileSize, entryToModify.createdAt.getTime()));
        }
        return this.repo.saveEntry(builder.build());
    }

    private async calculateCustomExpires(
        entry: IBuilder<FileUploadModel>,
        expires: string,
        secretToken?: string,
        bucketToken?: string,
    ): Promise<void> {
        let value: number = ObjectUtils.getNumber(expires);
        let timeFactor: TimeUnit = TimeUnit.MINUTES;

        if (value === 0) {
            throw new BadRequest(`Unable to parse expire value from ${expires}`);
        }
        if (expires.includes("d")) {
            timeFactor = TimeUnit.DAYS;
        } else if (expires.includes("h")) {
            timeFactor = TimeUnit.HOURS;
        }
        value = ObjectUtils.convertToMilli(value, timeFactor);

        const unlimitedExpire = await this.hasUnlimitedExpire(secretToken, bucketToken);

        const maxExp: number | null = unlimitedExpire
            ? null
            : FileUtils.getTimeLeftBySize(entry.fileSize(), this.maxFileSize);

        if (maxExp !== null && value > maxExp) {
            throw new BadRequest(`Cannot extend time remaining beyond ${ObjectUtils.timeToHuman(maxExp)}`);
        }
        entry.expires(Date.now() + value);
    }

    private async hasUnlimitedExpire(secretToken?: string, bucketToken?: string): Promise<boolean> {
        if (this.secret && secretToken === this.secret) {
            return true;
        }

        if (bucketToken) {
            const bucket = await this.bucketService.getBucket(bucketToken, false, false);
            if (bucket && bucket.type === BucketType.PREMIUM) {
                return true;
            }
        }

        return false;
    }

    private getFileHash(resourcePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hashSum = crypto.createHash("md5");
            const stream = createReadStream(resourcePath);
            stream.on("data", (chunk: Buffer) => hashSum.update(chunk));
            stream.on("end", () => resolve(hashSum.digest("hex")));
            stream.on("error", reject);
        });
    }
    private async filterFile(resourcePath: PlatformMulterFile | string): Promise<void> {
        const failedFilters = await this.fileFilterManager.process(resourcePath);
        if (failedFilters.length > 0) {
            // throw the error of the highest priority
            throw failedFilters.sort((a, b) => b.priority - a.priority)[0].error;
        }
    }

    public incrementViews(token: string): Promise<number> {
        return this.repo.incrementViews(token);
    }
}
