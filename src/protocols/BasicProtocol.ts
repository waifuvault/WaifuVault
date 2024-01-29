import {Arg, OnVerify, Protocol} from "@tsed/passport";
import {UserModel} from "../model/db/User.model";
import {BasicStrategy} from "passport-http";
import {Inject} from "@tsed/di";
import {UserService} from "../services/UserService";

@Protocol({
    name: "basic",
    useStrategy: BasicStrategy
})
export class BasicProtocol implements OnVerify {

    @Inject()
    private usersService: UserService;

    public async $onVerify(@Arg(0) email: string, @Arg(1) password: string): Promise<UserModel | false> {
        const user = await this.usersService.getUser(email, password);
        if (!user) {
            return false;
        }
        return user;
    }
}
