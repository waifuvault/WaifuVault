import { Inject, Injectable } from "@tsed/di";
import { AbstractTypeOrmDao } from "./AbstractTypeOrmDao.js";
import { UserModel } from "../../model/db/User.model.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import { DataSource, EntityManager } from "typeorm";

@Injectable()
export class UserDao extends AbstractTypeOrmDao<UserModel> {
    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, UserModel);
    }

    public getUser(email: string, transaction?: EntityManager): Promise<UserModel | null> {
        return this.getRepository(transaction).findOneBy({
            email,
        });
    }

    public getAllUsers(transaction?: EntityManager): Promise<UserModel[]> {
        return this.getRepository(transaction).find();
    }

    public saveOrUpdateUser(userModel: UserModel, transaction?: EntityManager): Promise<UserModel> {
        return this.getRepository(transaction).save(userModel);
    }
}
