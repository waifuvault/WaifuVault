import {Req} from "@tsed/common";
import {Inject} from "@tsed/di";
import {BodyParams} from "@tsed/platform-params";
import {OnVerify, Protocol} from "@tsed/passport";
import {IStrategyOptions, Strategy} from "passport-local";
import {UserModel} from "../model/db/User.model.js";
import {UserService} from "../services/UserService.js";

@Protocol<IStrategyOptions>({
    name: "login",
    useStrategy: Strategy,
    settings: {
        session: true,
        usernameField: "email",
        passwordField: "password",
    }
})
export class LoginLocalProtocol implements OnVerify {

    @Inject()
    private usersService: UserService;

    public async $onVerify(@Req() request: Req, @BodyParams() credentials: UserModel): Promise<UserModel | false> {
        const {email, password} = credentials;
        const user = await this.usersService.getUser(email, password);
        if (!user) {
            return false;
        }
        return user;
    }
}
