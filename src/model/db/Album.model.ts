import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { AbstractModel } from "./AbstractModel.js";
import type { FileUploadModel } from "./FileUpload.model.js";
import type { BucketModel } from "./Bucket.model.js";
import { constant } from "@tsed/di";
import { GlobalEnv } from "../constants/GlobalEnv.js";

@Entity()
@Index(["albumToken"], {
    unique: true,
})
@Index(["bucketToken", "name"], {
    unique: true,
})
@Index(["publicToken"], {
    unique: true,
})
@Index(["bucketToken"])
@Index(["name"])
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

    @Column({
        nullable: true,
        type: "text",
        unique: true,
    })
    public publicToken: string | null;

    @Column({
        nullable: false,
        default: 0,
    })
    public views: number;

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

    public isPublicToken(token: string): boolean {
        return this.publicToken === token;
    }

    public get publicUrl(): string | null {
        if (!this.publicToken) {
            return null;
        }
        const baseUrl = constant(GlobalEnv.BASE_URL) as string;
        return `${baseUrl}/album/${this.publicToken}`;
    }

    public get isShared(): boolean {
        return this.publicToken !== null;
    }
}
