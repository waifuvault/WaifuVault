import { Inject, Injectable } from "@tsed/di";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import { DataSource, EntityManager } from "typeorm";
import { AlbumModel } from "../../model/db/Album.model.js";
import { AbstractTypeOrmDao } from "./AbstractTypeOrmDao.js";

@Injectable()
export class AlbumDao extends AbstractTypeOrmDao<AlbumModel> {
    public constructor(@Inject(SQLITE_DATA_SOURCE) ds: DataSource) {
        super(ds, AlbumModel);
    }

    public saveOrUpdateAlbum(album: AlbumModel, transaction?: EntityManager): Promise<AlbumModel> {
        return this.getRepository(transaction).save(album);
    }

    public async deleteAlbum(albumToken: string, transaction?: EntityManager): Promise<boolean> {
        const deleteResult = await this.getRepository(transaction).delete({
            albumToken,
        });
        return deleteResult.affected === 1;
    }

    public getAlbum(token: string, transaction?: EntityManager): Promise<AlbumModel | null> {
        return this.getRepository(transaction).findOne({
            relations: ["files"],
            where: [
                {
                    albumToken: token,
                },
                {
                    publicToken: token,
                },
            ],
        });
    }

    public getAlbumByName(name: string, bucket: string, transaction?: EntityManager): Promise<AlbumModel | null> {
        return this.getRepository(transaction).findOne({
            where: { name: name, bucketToken: bucket },
            select: ["name", "bucketToken", "albumToken"],
        });
    }

    public albumNameExists(name: string, bucketToken: string, transaction?: EntityManager): Promise<boolean> {
        return this.getRepository(transaction).existsBy({
            bucketToken,
            name,
        });
    }

    public albumExists(publicToken: string, transaction?: EntityManager): Promise<boolean> {
        return this.getRepository(transaction).existsBy({
            publicToken,
        });
    }
}
