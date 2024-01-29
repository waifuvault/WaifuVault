import {Inject, Service} from "@tsed/di";
import {UserModel} from "../model/db/User.model";
import argon2 from "argon2";
import {CustomUserInfoModel} from "../model/auth/CustomUserInfoModel";
import {Logger} from "@tsed/logger";
import {Unauthorized} from "@tsed/exceptions";
import {UserRepo} from "../db/repo/UserRepo";

@Service()
export class UserService {

    @Inject()
    private userRepo: UserRepo;

    @Inject()
    private logger: Logger;

    public async getUser(email: string, password: string): Promise<UserModel | null> {
        const userObject = await this.userRepo.getUser(email);
        // use safe timings compare to verify the hash matches
        if (!userObject || !await argon2.verify(userObject.password, password)) {
            return null;
        }
        return userObject;
    }

    public async changeDetails(newModel: UserModel, loggedInUser: CustomUserInfoModel): Promise<UserModel> {
        const userObject = await this.userRepo.getUser(loggedInUser.email);
        if (!userObject) {
            throw new Unauthorized("You are not logged in");
        }
        userObject.email = newModel.email;
        userObject.password = await argon2.hash(newModel.password);
        return this.userRepo.updateUser(userObject);
    }
}
