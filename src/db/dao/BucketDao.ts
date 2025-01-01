import { AbstractTypeOrmDao } from "./AbstractTypeOrmDao.js";
import { BucketModel } from "../../model/db/Bucket.model.js";
import { Inject, Injectable } from "@tsed/di";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import { DataSource, EntityManager } from "typeorm";

@Injectable()
export class BucketDao extends AbstractTypeOrmDao<BucketModel> {
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
            return this.getRepository(transaction).findOne({
                relations: ["albums", "files.album"],
                where: {
                    id,
                },
            });
        }
        return this.getRepository(transaction).findOne({
            relations: ["albums", "files.album"],
            where: {
                bucketToken: id,
            },
        });
    }

    public getBucketByIp(ip: string, transaction?: EntityManager): Promise<BucketModel | null> {
        return this.getRepository(transaction).findOne({
            relations: ["albums", "files.album"],
            where: {
                ip,
            },
        });
    }
}
