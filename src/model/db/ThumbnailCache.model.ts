import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { AbstractModel } from "./AbstractModel.js";
import { FileUploadModel } from "./FileUpload.model.js";

@Entity()
@Index(["fileId"], {
    unique: true,
})
export class ThumbnailCacheModel extends AbstractModel {
    @Column({
        nullable: false,
        type: "text",
    })
    public data: string;

    @Column({
        nullable: false,
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
