import { Inject, Injectable } from "@tsed/di";
import { AbstractTypeOrmDao } from "./AbstractTypeOrmDao.js";
import { IpBlackListModel } from "../../model/db/IpBlackList.model.js";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import { DataSource, EntityManager, In } from "typeorm";

@Injectable()
export class IpBlackListDao extends AbstractTypeOrmDao<IpBlackListModel> {
    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, IpBlackListModel);
    }

    public addIpBlock(entry: IpBlackListModel, transaction?: EntityManager): Promise<IpBlackListModel> {
        return this.getRepository(transaction).save(entry);
    }

    public isIpBlocked(ip: string, transaction?: EntityManager): Promise<boolean> {
        return this.getRepository(transaction).existsBy({
            ip,
        });
    }

    public async removeBlockedIps(ips: string[], transaction?: EntityManager): Promise<boolean> {
        const result = await this.getRepository(transaction).delete({
            ip: In(ips),
        });
        return result.affected === ips.length;
    }

    public getAllBlockedIps(transaction?: EntityManager): Promise<IpBlackListModel[]> {
        return this.getRepository(transaction).find();
    }
}
