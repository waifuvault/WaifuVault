import {Column, Entity, Index} from "typeorm";
import {AbstractModel} from "./AbstractModel.js";
import {FileUtils} from "../../utils/Utils.js";
import type {EntrySettings} from "../../utils/typeings.js";

@Entity()
@Index(["token"], {
    unique: true
})
export class FileUploadModel extends AbstractModel {

    @Column({
        nullable: false,
        type: "text",
        unique: false
    })
    public fileName: string;

    @Column({
        nullable: false,
        type: "text",
        unique: false
    })
    public token: string;

    @Column({
        nullable: false,
        type: "text",
        unique: false
    })
    public checksum: string;

    @Column({
        nullable: false,
        type: "text",
        unique: false
    })
    public ip: string;

    @Column({
        nullable: false,
        type: "text",
        default: "",
        unique: false
    })
    public originalFileName: string;

    @Column({
        nullable: true,
        type: "text",
        unique: false
    })
    public fileExtension: string | null;

    @Column({
        nullable: false,
        type: "integer",
        unique: false
    })
    public fileSize: number;

    @Column({
        nullable: false,
        type: "integer",
        unique: false
    })
    public expires: number;

    @Column({
        nullable: true,
        type: "simple-json",
        unique: false
    })
    public settings: EntrySettings | null;

    @Column({
        nullable: true,
        type: "text",
        unique: false
    })
    public mediaType: string | null;


    @Column({
        nullable: false,
        unique: false,
        default: false
    })
    public encrypted: boolean;

    public get expiresIn(): number {
        return FileUtils.getTImeLeft(this);
    }

    public get hasExpired(): boolean {
        return FileUtils.isFileExpired(this);
    }

    public get fileProtectionLevel(): string {
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

}
