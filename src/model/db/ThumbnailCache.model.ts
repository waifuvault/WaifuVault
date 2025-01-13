import { Column, Entity } from "typeorm";
import { AbstractModel } from "./AbstractModel.js";

@Entity()
export class ThumbnailCacheModel extends AbstractModel {
    @Column({
        nullable: false,
        type: "text",
        unique: true,
    })
    public data: string;
}
