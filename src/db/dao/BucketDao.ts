import { AbstractTypeOrmDao } from "./AbstractTypeOrmDao.js";
import { BucketModel } from "../../model/db/Bucket.model.js";
import { Inject, Injectable } from "@tsed/di";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import { DataSource, EntityManager } from "typeorm";
import bucketType from "../../model/constants/BucketType";
import BucketType from "../../model/constants/BucketType";

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

    public bucketExists(token: string, transaction?: EntityManager): Promise<boolean> {
        return this.getRepository(transaction).existsBy({
            bucketToken: token,
        });
    }

    public async setBucketType(token: string, newType: bucketType, transaction?: EntityManager): Promise<boolean> {
        const bucket = await this.getRepository(transaction).findOne({ where: { bucketToken: token } });
        if (!bucket) {
            return false;
        }
        bucket.type = newType;
        await this.getRepository(transaction).save(bucket);
        return true;
    }

    public async getBucketType(token: string, transaction?: EntityManager): Promise<BucketType | null> {
        const bType = await this.getRepository(transaction).findOne({
            where: { bucketToken: token },
        });
        return bType?.type ?? null;
    }
}
