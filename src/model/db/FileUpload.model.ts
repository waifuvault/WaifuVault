import {Column, Entity, Index} from "typeorm";
import {AbstractModel} from "./AbstractModel";

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
}
