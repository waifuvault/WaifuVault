import { FileRepo } from "../db/repo/FileRepo.js";
import { Inject, Service } from "@tsed/di";
import { EncryptionService } from "./EncryptionService.js";
import { RecordInfoSocket } from "./socket/RecordInfoSocket.js";
import { Logger } from "@tsed/logger";
import { FileUploadModel } from "../model/db/FileUpload.model.js";
import { StorageService } from "./StorageService.js";
import { StorageOperationError } from "../model/exceptions/StorageOperationError.js";
import { BadRequest, Forbidden, NotFound } from "@tsed/exceptions";
import { EntryEncryptionWrapper } from "../model/rest/EntryEncryptionWrapper.js";

/**
 * Class that deals with interacting files from the filesystem
 */
@Service()
export class FileService {
    public constructor(
        @Inject() private repo: FileRepo,
        @Inject() private encryptionService: EncryptionService,
        @Inject() private recordInfoSocket: RecordInfoSocket,
        @Inject() private logger: Logger,
        @Inject() private storageService: StorageService,
    ) {}

    public async processDelete(tokens: string[], softDelete = false): Promise<boolean> {
        let deleted: boolean;
        const entries = await this.repo.getEntries(tokens, false);
        if (entries.length === 0) {
            return false;
        }
        try {
            await this.deleteFilesFromDisk(entries, softDelete);
            deleted = await this.repo.deleteEntries(tokens);
        } catch (e) {
            this.logger.error(e);
            return false;
        }
        this.recordInfoSocket.emit();
        return deleted;
    }

    public async deleteFilesFromDisk(entries: FileUploadModel[], softDelete = false): Promise<void> {
        try {
            await this.storageService.delete(entries, softDelete);
        } catch (e) {
            const failures = e instanceof StorageOperationError ? e.failures : [e];
            for (const failure of failures) {
                if ((failure as NodeJS.ErrnoException).code === "EPERM") {
                    this.logger.warn(failure);
                } else {
                    this.logger.error(failure);
                }
            }
        }
    }

    public async getEntry(
        fileNameOnSystem: string,
        requestedFileName?: string,
        password?: string,
    ): Promise<EntryEncryptionWrapper> {
        const entry = await this.repo.getEntryByFileName(fileNameOnSystem);
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

        if (entry.hasExpired || !(await this.storageService.exists(entry))) {
            await this.processDelete([entry.token]);
            this.resourceNotFound(resource);
        }

        if (entry.settings?.password) {
            if (!password) {
                throw new Forbidden(`${entry?.encrypted ? "Encrypted" : "Protected"} file requires a password`);
            }
            const passwordMatches = await this.encryptionService.validatePassword(entry, password);
            if (!passwordMatches) {
                throw new Forbidden("Password is incorrect");
            }
        }
        return new EntryEncryptionWrapper(entry);
    }

    public async isFileEncrypted(resource: string): Promise<boolean> {
        const entry = await this.repo.getEntryByFileName(resource);
        if (!entry) {
            return false;
        }
        return entry.encrypted;
    }

    public async requiresPassword(resource: string): Promise<boolean> {
        const entry = await this.repo.getEntryByFileName(resource);
        if (!entry) {
            return false;
        }
        return !!entry.settings?.password;
    }

    public async getFileUrl(resource: string): Promise<string | null> {
        const entry = await this.repo.getEntryByFileName(resource);
        if (entry) {
            return entry.getPublicUrl();
        }
        return null;
    }

    public async getFileInfo(token: string): Promise<FileUploadModel> {
        const foundEntries = await this.repo.getEntries([token]);
        if (foundEntries.length !== 1) {
            this.unknownToken(token);
        }
        const entry = foundEntries[0];
        if (entry.hasExpired) {
            await this.processDelete([entry.token]);
            this.unknownToken(token);
        }
        return entry;
    }

    private resourceNotFound(resource: string): never {
        throw new NotFound(`resource ${resource} is not found`);
    }

    private unknownToken(token: string): never {
        throw new BadRequest(`Unknown token ${token}`);
    }
}
