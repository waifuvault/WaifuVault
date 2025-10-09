import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { AbstractModel } from "./AbstractModel.js";
import { filesDir, FileUtils } from "../../utils/Utils.js";
import type { EntrySettings, ProtectionLevel } from "../../utils/typeings.js";
import path from "node:path";
import type { BucketModel } from "./Bucket.model.js";
import { AlbumModel } from "./Album.model.js";
import { constant } from "@tsed/di";
import type { ThumbnailCacheModel } from "./ThumbnailCache.model.js";
import { ColumnNumericTransformer } from "../../utils/dbUtils.js";
import { GlobalEnv } from "../constants/GlobalEnv.js";

@Entity()
@Index(["token"], {
    unique: true,
})
@Index(["checksum"])
@Index(["expires"])
@Index(["bucketToken"])
@Index(["albumToken"])
@Index(["ip"])
@Index(["fileName"])
@Index(["bucketToken", "expires"])
@Index(["albumToken", "addedToAlbumOrder"])
@Index(["checksum", "expires"])
export class FileUploadModel extends AbstractModel {
    @Column({
        nullable: false,
        type: "text",
        unique: false,
    })
    public fileName: string;

    @Column({
        nullable: false,
        type: "text",
        unique: false,
    })
    public token: string;

    @Column({
        nullable: false,
        type: "text",
        unique: false,
    })
    public checksum: string;

    @Column({
        nullable: true,
        type: "text",
        unique: false,
    })
    public ip: string | null;

    @Column({
        nullable: false,
        type: "text",
        default: "",
        unique: false,
    })
    public originalFileName: string;

    @Column({
        nullable: true,
        type: "text",
        unique: false,
    })
    public fileExtension: string | null;

    @Column({
        nullable: false,
        type: "numeric",
        unique: false,
        transformer: new ColumnNumericTransformer<FileUploadModel>("fileSize"),
    })
    public fileSize: number;

    @Column({
        nullable: true,
        type: "numeric",
        unique: false,
        transformer: new ColumnNumericTransformer<FileUploadModel>("expires"),
    })
    public expires: number | null;

    @Column({
        nullable: true,
        type: "simple-json",
        unique: false,
    })
    public settings: EntrySettings | null;

    @Column({
        nullable: true,
        type: "text",
        unique: false,
    })
    public mediaType: string | null;

    @Column({
        nullable: false,
        unique: false,
        default: false,
    })
    public encrypted: boolean;

    @Column({
        nullable: true,
    })
    public bucketToken: string | null;

    @Column({
        nullable: true,
        type: "text",
    })
    public albumToken: string | null;

    @Column({
        nullable: false,
        default: 0,
    })
    public views: number;

    @Column({
        nullable: true,
        type: "numeric",
        transformer: new ColumnNumericTransformer<FileUploadModel>("addedToAlbumOrder"),
    })
    public addedToAlbumOrder: number | null;

    @ManyToOne("BucketModel", "files", {
        ...AbstractModel.cascadeOps,
    })
    @JoinColumn({
        name: "bucketToken",
        referencedColumnName: "bucketToken",
    })
    public bucket: Promise<BucketModel | null>;

    @ManyToOne("AlbumModel", "files", {
        ...AbstractModel.cascadeOps,
    })
    @JoinColumn({
        name: "albumToken",
        referencedColumnName: "albumToken",
    })
    public album: Promise<AlbumModel | null>;

    /**
     * Be careful when doing this, as this will bypass redis and go directly to the DB, it is best to use the ThumbnailCacheRepo
     */
    @OneToOne("ThumbnailCacheModel", "file")
    @JoinColumn()
    public thumbnailCache: Promise<ThumbnailCacheModel | null>;

    public get expiresIn(): number | null {
        if (this.expires === null) {
            return null;
        }
        return FileUtils.getTimeLeft(this);
    }

    public get hasExpired(): boolean {
        return FileUtils.isFileExpired(this);
    }

    public get fileProtectionLevel(): ProtectionLevel {
        if (this.encrypted) {
            return "Encrypted";
        }
        if (this.settings?.password) {
            return "Password";
        }
        return "None";
    }

    /**
     * Get the file and the extension if one exists. the result will be the exact filename that appears in your upload file dir
     * @returns {string}
     */
    public get fullFileNameOnSystem(): string {
        if (this.fileExtension) {
            return `${this.fileName}.${this.fileExtension}`;
        }
        return this.fileName;
    }

    /**
     * Get the full absolute location on disk
     * @returns {string}
     */
    public get fullLocationOnDisk(): string {
        return path.resolve(`${filesDir}/${this.fullFileNameOnSystem}`);
    }

    public getPublicUrl(): string {
        const isProtected = this.fileProtectionLevel !== "None";
        const pathPrefix = isProtected ? "/p" : "/f";

        const frontendUrl = constant(GlobalEnv.FRONT_END_URL) ?? constant(GlobalEnv.BASE_URL);
        const backendUrl = constant(GlobalEnv.BASE_URL);

        const baseUrl = isProtected ? frontendUrl : backendUrl;

        let url: string;
        if (this.settings?.hideFilename || !this.originalFileName) {
            url = `${baseUrl}${pathPrefix}/${this.fullFileNameOnSystem}`;
        } else {
            let { originalFileName } = this;
            if (originalFileName.startsWith("/")) {
                originalFileName = originalFileName.substring(1);
            }
            url = `${baseUrl}${pathPrefix}/${this.fileName}/${originalFileName}`;
        }
        return encodeURI(url);
    }

    public get parsedFileName(): string {
        if (this.settings?.hideFilename || !this.originalFileName) {
            return this.fullFileNameOnSystem;
        }
        let { originalFileName } = this;
        if (originalFileName.startsWith("/")) {
            originalFileName = originalFileName.substring(1);
        }
        return originalFileName;
    }
}
