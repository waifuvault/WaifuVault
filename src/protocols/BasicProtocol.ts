import type { OnVerify } from "@tsed/passport";
import { Arg, Protocol } from "@tsed/passport";
import { UserModel } from "../model/db/User.model.js";
import { BasicStrategy } from "passport-http";
import { Inject } from "@tsed/di";
import { UserService } from "../services/UserService.js";

@Protocol({
    name: "basic",
    useStrategy: BasicStrategy,
})
export class BasicProtocol implements OnVerify {
    public constructor(@Inject() private usersService: UserService) {}

    public async $onVerify(@Arg(0) email: string, @Arg(1) password: string): Promise<UserModel | false> {
        const user = await this.usersService.getUser(email, password);
        if (!user) {
            return false;
        }
        return user;
    }
}
