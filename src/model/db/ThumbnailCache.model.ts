import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { AbstractModel } from "./AbstractModel.js";
import { FileUploadModel } from "./FileUpload.model.js";

@Entity()
export class ThumbnailCacheModel extends AbstractModel {
    @Column({
        nullable: false,
        type: "text",
    })
    public data: string;

    @Column({
        nullable: true,
    })
    public fileId: number;

    @OneToOne("FileUploadModel", "thumbnail", {
        ...AbstractModel.cascadeOps,
    })
    @JoinColumn({
        name: "fileId",
        referencedColumnName: "id",
    })
    public file: Promise<FileUploadModel>;
}
