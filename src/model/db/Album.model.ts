import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { AbstractModel } from "./AbstractModel.js";
import type { FileUploadModel } from "./FileUpload.model.js";
import type { BucketModel } from "./Bucket.model.js";

@Entity()
@Index(["albumToken"], {
    unique: true,
})
@Index(["bucketToken", "name"], {
    unique: true,
})
export class AlbumModel extends AbstractModel {
    @Column({
        nullable: false,
        type: "text",
    })
    public name: string;

    @Column({
        nullable: false,
    })
    public bucketToken: string;

    @Column({
        nullable: false,
        type: "text",
    })
    public albumToken: string;

    @OneToMany("FileUploadModel", "album", {
        cascade: true,
    })
    public files?: FileUploadModel[];

    @ManyToOne("BucketModel", "album", {
        ...AbstractModel.cascadeOps,
    })
    @JoinColumn({
        name: "bucketToken",
        referencedColumnName: "bucketToken",
    })
    public bucket: Promise<BucketModel | null>;

    public removeFiles(filesToRemove: FileUploadModel[] | FileUploadModel): void {
        if (!this.files) {
            return;
        }
        if (Array.isArray(filesToRemove)) {
            for (const fileToRemove of filesToRemove) {
                fileToRemove.albumToken = null;
                this.files = this.files.filter(f => f.token !== fileToRemove.token);
            }
        } else {
            filesToRemove.albumToken = null;
            this.files = this.files.filter(f => f.token !== filesToRemove.token);
        }
    }

    public addFiles(filesToAdd: FileUploadModel[] | FileUploadModel): void {
        if (!this.files) {
            this.files = [];
        }
        if (Array.isArray(filesToAdd)) {
            for (const fileToAdd of filesToAdd) {
                if (!this.fileExists(fileToAdd)) {
                    fileToAdd.albumToken = this.albumToken;
                    this.files.push(fileToAdd);
                }
            }
        } else {
            if (!this.fileExists(filesToAdd)) {
                filesToAdd.albumToken = this.albumToken;
                this.files.push(filesToAdd);
            }
        }
    }

    private fileExists(file: FileUploadModel): boolean {
        return this.files?.some(f => f.token === file.token) ?? false;
    }
}
