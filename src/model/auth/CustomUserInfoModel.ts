import {Property} from "@tsed/schema";

export class CustomUserInfoModel {

    @Property()
    public id: string;

    @Property()
    public email: string;
}
