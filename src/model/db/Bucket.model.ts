import { AbstractModel } from "./AbstractModel.js";
import { Column, Entity, Index, OneToMany } from "typeorm";
import type { FileUploadModel } from "./FileUpload.model.js";

@Entity()
@Index(["bucketToken"], {
    unique: true,
})
export class BucketModel extends AbstractModel {
    @Column({
        nullable: false,
        type: "text",
    })
    public bucketToken: string;

    @Column({
        nullable: false,
        type: "text",
        unique: true,
    })
    public ip: string;

    @OneToMany("FileUploadModel", "bucket", {
        cascade: true,
        eager: true,
    })
    public files: FileUploadModel[];
}
