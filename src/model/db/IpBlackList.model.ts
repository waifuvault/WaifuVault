import {Column, Entity} from "typeorm";
import {AbstractModel} from "./AbstractModel";

@Entity()
export class IpBlackListModel extends AbstractModel {

    @Column({
        nullable: false,
        type: "text",
        unique: true
    })
    public ip: string;
}
