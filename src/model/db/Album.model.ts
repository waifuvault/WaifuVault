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

    public addFiles(filesToAdd: FileUploadModel[]): void {
        if (!this.files) {
            this.files = [];
        }
        for (const fileToAdd of filesToAdd) {
            if (!this.fileExists(fileToAdd)) {
                fileToAdd.albumToken = this.albumToken;
                this.files.push(fileToAdd);
            }
        }
    }

    public addFile(fileToAdd: FileUploadModel): void {
        if (!this.files) {
            this.files = [];
        }
        if (!this.fileExists(fileToAdd)) {
            fileToAdd.albumToken = this.albumToken;
            this.files.push(fileToAdd);
        }
    }

    private fileExists(file: FileUploadModel): boolean {
        return this.files?.some(f => f.token === file.token) ?? false;
    }
}
