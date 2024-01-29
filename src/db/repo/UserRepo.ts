import {Inject, Injectable, ProviderScope} from "@tsed/di";
import {UserDao} from "../dao/UserDao";
import {UserModel} from "../../model/db/User.model";
import {Builder} from "builder-pattern";

@Injectable({
    scope: ProviderScope.SINGLETON
})
export class UserRepo {

    @Inject()
    private userDao: UserDao;

    public getUser(email: string): Promise<UserModel | null> {
        return this.userDao.getUser(email);
    }

    public getAllUsers(): Promise<UserModel[]> {
        return this.userDao.getAllUsers();
    }

    public createUser(email: string, password: string): Promise<UserModel> {
        const model = Builder(UserModel)
            .email(email)
            .password(password)
            .build();
        return this.userDao.saveOrUpdateUser(model);
    }

    public updateUser(user: UserModel): Promise<UserModel> {
        return this.userDao.saveOrUpdateUser(user);
    }
}
