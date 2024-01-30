import {Inject, Injectable} from "@tsed/di";
import {IpBlackListModel} from "../../model/db/IpBlackList.model";
import {IpBlackListDao} from "../dao/IpBlackListDao";
import {Builder} from "builder-pattern";

@Injectable()
export class IpBlackListRepo {

    @Inject()
    private fileDao: IpBlackListDao;

    public addIpBlock(ip: string): Promise<IpBlackListModel> {
        return this.fileDao.addIpBlock(Builder(IpBlackListModel).ip(ip).build());
    }

    public isIpBlocked(ip: string): Promise<boolean> {
        return this.fileDao.isIpBlocked(ip);
    }
}
