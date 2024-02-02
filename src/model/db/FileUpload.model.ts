import {Column, Entity, Index} from "typeorm";
import {AbstractModel} from "./AbstractModel.js";
import {FileUtils} from "../../utils/Utils.js";

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
        type: "integer",
        unique: false
    })
    public fileSize: number;

    @Column({
        nullable: true,
        type: "integer",
        unique: false
    })
    public customExpires: number;

    public get expiresIn(): number {
        return FileUtils.getTImeLeft(this);
    }

}
