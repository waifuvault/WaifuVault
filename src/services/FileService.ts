import { FileRepo } from "../db/repo/FileRepo.js";
import { Constant, Inject, Service } from "@tsed/di";
import GlobalEnv from "../model/constants/GlobalEnv.js";
import { EncryptionService } from "./EncryptionService.js";
import { RecordInfoSocket } from "./socket/RecordInfoSocket.js";
import { Logger } from "@tsed/logger";
import { MimeService } from "./MimeService.js";
import { FileUtils } from "../utils/Utils.js";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { FileUploadResponseDto } from "../model/dto/FileUploadResponseDto.js";
import { BadRequest, NotFound, UnsupportedMediaType } from "@tsed/exceptions";

/**
 * Class that deals with interacting files from the filesystem
 */
@Service()
export class FileService {
    @Constant(GlobalEnv.BASE_URL)
    private readonly baseUrl: string;

    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private encryptionService: EncryptionService,
        @Inject() private recordInfoSocket: RecordInfoSocket,
        @Inject() private logger: Logger,
        @Inject() private mimeService: MimeService,
    ) {}

    public async processDelete(tokens: string[]): Promise<boolean> {
        let deleted = false;
        const entries = await this.repo.getEntry(tokens);
        if (entries.length === 0) {
            return false;
        }
        try {
            await this.deleteFilesFromDisk(entries);
            deleted = await this.repo.deleteEntries(tokens);
        } catch (e) {
            this.logger.error(e);
            return false;
        }
        await this.recordInfoSocket.emit();
        return deleted;
    }

    public async deleteFilesFromDisk(entries: FileUploadModel[]): Promise<void> {
        const fileDeletePArr = entries.map(entry => {
            return FileUtils.deleteFile(entry.fullFileNameOnSystem, true);
        });
        await Promise.all(fileDeletePArr);
    }

    public async getEntry(
        fileNameOnSystem: string,
        requestedFileName?: string,
        password?: string,
    ): Promise<[Buffer, FileUploadModel]> {
        const entry = await this.repo.getEntryFileName(fileNameOnSystem);
        const resource = requestedFileName ?? fileNameOnSystem;
        if (entry === null) {
            this.resourceNotFound(resource);
        }

        let { originalFileName } = entry;
        if (originalFileName.startsWith("/")) {
            originalFileName = originalFileName.substring(1);
        }
        if (requestedFileName && originalFileName !== requestedFileName) {
            this.resourceNotFound(resource);
        }

        if (entry.hasExpired) {
            await this.processDelete([entry.token]);
            this.resourceNotFound(resource);
        }

        return Promise.all([this.encryptionService.decrypt(entry, password), entry]);
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

    public async getFileInfo(token: string, humanReadable: boolean): Promise<FileUploadResponseDto> {
        const foundEntries = await this.repo.getEntry([token]);
        if (foundEntries.length !== 1) {
            this.unknownToken(token);
        }
        const entry = foundEntries[0];
        if (entry.hasExpired) {
            await this.processDelete([entry.token]);
            this.unknownToken(token);
        }
        return FileUploadResponseDto.fromModel(entry, this.baseUrl, humanReadable);
    }

    public async checkMime(resourcePath: string): Promise<void> {
        let failedMime = false;
        try {
            failedMime = await this.mimeService.isBlocked(resourcePath);
        } catch (e) {
            FileUtils.deleteFile(resourcePath);
            throw e;
        }

        if (failedMime) {
            FileUtils.deleteFile(resourcePath);
            throw new UnsupportedMediaType(`MIME type not supported`);
        }
    }

    private resourceNotFound(resource: string): never {
        throw new NotFound(`resource ${resource} is not found`);
    }

    private unknownToken(token: string): never {
        throw new BadRequest(`Unknown token ${token}`);
    }
}
