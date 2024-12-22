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

    public getAlbum(id: string | number, transaction?: EntityManager): Promise<AlbumModel | null> {
        if (typeof id === "number") {
            return this.getRepository(transaction).findOne({
                relations: ["files"],
                where: {
                    id,
                },
            });
        }
        return this.getRepository(transaction).findOne({
            relations: ["files"],
            where: {
                albumToken: id,
            },
        });
    }

    public getAlbumFromName(
        name: string,
        bucketToken: string,
        transaction?: EntityManager,
    ): Promise<AlbumModel | null> {
        return this.getRepository(transaction).findOneBy({
            bucketToken,
            name,
        });
    }
}
