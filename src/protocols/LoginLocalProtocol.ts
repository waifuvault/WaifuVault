import { Inject } from "@tsed/di";
import { BodyParams } from "@tsed/platform-params";
import type { OnVerify } from "@tsed/passport";
import { Protocol } from "@tsed/passport";
import type { IStrategyOptions } from "passport-local";
import { Strategy } from "passport-local";
import { UserModel } from "../model/db/User.model.js";
import { UserService } from "../services/UserService.js";

@Protocol<IStrategyOptions>({
    name: "loginAuthProvider",
    useStrategy: Strategy,
    settings: {
        session: true,
        usernameField: "email",
        passwordField: "password",
    },
})
export class LoginLocalProtocol implements OnVerify {
    public constructor(@Inject() private usersService: UserService) {}

    public async $onVerify(@BodyParams() credentials: UserModel): Promise<UserModel | false> {
        const { email, password } = credentials;
        const user = await this.usersService.getUser(email, password);
        if (!user) {
            return false;
        }
        return user;
    }
}
