import { AbstractDao } from "./AbstractDao.js";
import { BucketModel } from "../../model/db/Bucket.model.js";
import { Inject, Injectable } from "@tsed/di";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import { DataSource, EntityManager } from "typeorm";

@Injectable()
export class BucketDao extends AbstractDao<BucketModel> {
    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, BucketModel);
    }

    public createBucket(bucket: BucketModel, transaction?: EntityManager): Promise<BucketModel> {
        return this.getRepository(transaction).save(bucket);
    }

    public async deleteBucket(bucketToken: string, transaction?: EntityManager): Promise<boolean> {
        const deleteResult = await this.getRepository(transaction).delete({
            bucketToken,
        });
        return deleteResult.affected === 1;
    }

    public getBucket(id: string | number, transaction?: EntityManager): Promise<BucketModel | null> {
        if (typeof id === "number") {
            return this.getRepository(transaction).findOneBy({
                id,
            });
        }
        return this.getRepository(transaction).findOneBy({
            bucketToken: id,
        });
    }

    public getBucketByIp(ip: string, transaction?: EntityManager): Promise<BucketModel | null> {
        return this.getRepository(transaction).findOneBy({
            ip,
        });
    }
}
