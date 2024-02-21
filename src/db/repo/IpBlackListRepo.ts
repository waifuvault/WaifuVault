import {Inject, Injectable} from "@tsed/di";
import {IpBlackListModel} from "../../model/db/IpBlackList.model.js";
import {IpBlackListDao} from "../dao/IpBlackListDao.js";
import {Builder} from "builder-pattern";

@Injectable()
export class IpBlackListRepo {

    public constructor(
        @Inject() private ipBlackListDao: IpBlackListDao
    ) {
    }

    public addIpBlock(ip: string): Promise<IpBlackListModel> {
        return this.ipBlackListDao.addIpBlock(Builder(IpBlackListModel).ip(ip).build());
    }

    public isIpBlocked(ip: string): Promise<boolean> {
        return this.ipBlackListDao.isIpBlocked(ip);
    }

    public removeBlockedIps(ips: string[]): Promise<boolean> {
        return this.ipBlackListDao.removeBlockedIps(ips);
    }

    public getAllBlockedIps(): Promise<IpBlackListModel[]> {
        return this.ipBlackListDao.getAllBlockedIps();
    }
}
