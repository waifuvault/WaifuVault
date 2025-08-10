import { Inject, Service } from "@tsed/di";
import { AlbumModel } from "../../../model/db/Album.model";
import { ThumbnailCacheRepo } from "../../../db/repo/ThumbnailCacheRepo.js";
import { Logger } from "@tsed/logger";
import { FileUtils } from "../../../utils/Utils.js";
import { AfterInit } from "@tsed/platform-http";
import { FileUploadModel } from "../../../model/db/FileUpload.model.js";
import { isGhAction } from "../../../config/envs/index.js";
import { HTTPException } from "@tsed/exceptions";

@Service()
export class ThumbnailService implements AfterInit {
    // private readonly url = "http://127.0.0.1:8080/api/v1";
    private readonly url = "http://127.0.0.1:5006/api/v1";
    private supportedImageExtensions: string[] = ["jpg"];

    public constructor(
        @Inject() private thumbnailCacheReo: ThumbnailCacheRepo,
        @Inject() private logger: Logger,
    ) {}

    public async $afterInit(): Promise<void> {
        if (isGhAction) {
            return;
        }
        const response = await fetch(`${this.url}/generateThumbnails/supported`);
        if (!response.ok) {
            throw new Error("Unable to get supported extensions from microservice");
        }
        const json: string[] = await response.json();
        this.supportedImageExtensions = this.supportedImageExtensions.concat(json);
        this.logger.info(`loaded Supported image extensions`);
    }

    public async generateThumbnail(album: AlbumModel, filesIds: number[] = []): Promise<void> {
        const addingFiles = filesIds.length > 0;

        const entries =
            album.files?.filter(
                f => f.fileProtectionLevel === "None" && (filesIds.length === 0 || filesIds.includes(f.id)),
            ) ?? [];
        const cacheResults = await this.thumbnailCacheReo.hasThumbnails(entries.map(e => e.id));
        const toSend = entries
            .filter(
                entry =>
                    !cacheResults.includes(entry.id) &&
                    FileUtils.isValidForThumbnail(entry) &&
                    entry.mediaType &&
                    entry.fileExtension,
            )
            .map(entry => {
                return {
                    id: entry.id,
                    fileOnDisk: entry.fullFileNameOnSystem,
                    mediaType: entry.mediaType,
                    extension: entry.fileExtension,
                };
            });
        if (toSend.length === 0) {
            return;
        }
        const r = await fetch(
            `${this.url}/generateThumbnails?albumId=${album.id}&addingAdditionalFiles=${addingFiles}`,
            {
                body: JSON.stringify(toSend),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
        const json = await r.json();
        if (!r.ok) {
            throw new HTTPException(r.status, json.message);
        }
    }

    public isExtensionValidForThumbnail(file: FileUploadModel): boolean {
        const extension = file.fileExtension;
        if (!extension) {
            return false;
        }
        return this.supportedImageExtensions.includes(extension.toLowerCase());
    }
}
