import {Column, Entity} from "typeorm";
import {Description, Example, Format, Name, Required} from "@tsed/schema";
import {AbstractModel} from "./AbstractModel";

@Entity()
export class UserModel extends AbstractModel {

    @Column()
    @Description("User password")
    @Example("/5gftuD/")
    @Name("password")
    @Required()
    public password: string;

    @Column()
    @Description("User email")
    @Example("user@domain.com")
    @Format("email")
    @Name("email")
    @Required()
    public email: string;

}
