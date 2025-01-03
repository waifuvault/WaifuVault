import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractModel } from "./AbstractModel.js";
import { filesDir, FileUtils } from "../../utils/Utils.js";
import type { EntrySettings, ProtectionLevel } from "../../utils/typeings.js";
import path from "node:path";
import type { BucketModel } from "./Bucket.model.js";

@Entity()
@Index(["token"], {
    unique: true,
})
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
        nullable: false,
        type: "text",
        unique: false,
    })
    public ip: string;

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
        type: "integer",
        unique: false,
    })
    public fileSize: number;

    @Column({
        nullable: true,
        type: "integer",
        unique: false,
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
        nullable: false,
        default: 0,
    })
    public views: number;

    @ManyToOne("BucketModel", "files", {
        ...AbstractModel.cascadeOps,
    })
    @JoinColumn({
        name: "bucketToken",
        referencedColumnName: "bucketToken",
    })
    public bucket: BucketModel;

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
}
