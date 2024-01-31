import {Inject, Injectable} from "@tsed/di";
import {AbstractDao} from "./AbstractDao.js";
import {IpBlackListModel} from "../../model/db/IpBlackList.model.js";
import {SQLITE_DATA_SOURCE} from "../../model/di/tokens.js";
import {DataSource, EntityManager} from "typeorm";

@Injectable()
export class IpBlackListDao extends AbstractDao<IpBlackListModel> {

    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, IpBlackListModel);
    }

    public addIpBlock(entry: IpBlackListModel, transaction?: EntityManager): Promise<IpBlackListModel> {
        return this.getEntityManager(transaction).save(entry);
    }

    public async isIpBlocked(ip: string, transaction?: EntityManager): Promise<boolean> {
        const count = await this.getEntityManager(transaction).countBy({
            ip
        });
        return count === 1;
    }
}
