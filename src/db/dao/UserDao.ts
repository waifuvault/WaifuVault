import {Inject, Injectable} from "@tsed/di";
import {AbstractDao} from "./AbstractDao";
import {UserModel} from "../../model/db/User.model";
import {SQLITE_DATA_SOURCE} from "../../model/di/tokens";
import {DataSource, EntityManager} from "typeorm";

@Injectable()
export class UserDao extends AbstractDao<UserModel> {

    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, UserModel);
    }

    public getUser(email: string, transaction?: EntityManager): Promise<UserModel | null> {
        return this.getEntityManager(transaction).findOneBy({
            email
        });
    }

    public getAllUsers(transaction?: EntityManager): Promise<UserModel[]> {
        return this.getEntityManager(transaction).find();
    }

    public saveOrUpdateUser(userModel: UserModel, transaction?: EntityManager): Promise<UserModel> {
        return this.getEntityManager(transaction).save(userModel);
    }
}
