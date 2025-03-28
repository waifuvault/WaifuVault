import { Inject, Injectable } from "@tsed/di";
import { SQLITE_DATA_SOURCE } from "../../model/di/tokens.js";
import { DataSource, EntityManager } from "typeorm";
import { AlbumModel } from "../../model/db/Album.model.js";
import { AbstractTypeOrmDao } from "./AbstractTypeOrmDao.js";
import { uuid } from "../../utils/uuidUtils.js";

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

    public getAlbum(
        token: string,
        includeFiles = true,
        allowPublic = false,
        transaction?: EntityManager,
    ): Promise<AlbumModel | null> {
        if (allowPublic) {
            return this.getRepository(transaction).findOne({
                relations: includeFiles ? ["files"] : undefined,
                order: includeFiles
                    ? {
                          files: {
                              addedToAlbumOrder: "ASC",
                          },
                      }
                    : undefined,
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
        return this.getRepository(transaction).findOne({
            relations: includeFiles ? ["files"] : undefined,
            order: includeFiles
                ? {
                      files: {
                          addedToAlbumOrder: "ASC",
                      },
                  }
                : undefined,
            where: [
                {
                    albumToken: token,
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

    public async setShareStatus(
        albumToken: string,
        status: boolean,
        transaction?: EntityManager,
    ): Promise<string | null> {
        let ret = null;
        if (status) {
            ret = uuid();
        }
        await this.getRepository(transaction).update(
            {
                albumToken,
            },
            {
                publicToken: ret,
            },
        );
        return ret;
    }

    public async getPrivateAlbumToken(publicToken: string, transaction?: EntityManager): Promise<string | null> {
        const r = await this.getRepository(transaction).findOne({
            select: ["albumToken"],
            where: {
                publicToken,
            },
        });
        return r?.albumToken ?? null;
    }

    public getAllAlbums(
        includeFiles: boolean,
        bucketToken?: string,
        transaction?: EntityManager,
    ): Promise<AlbumModel[]> {
        if (!bucketToken) {
            return this.getRepository(transaction).find({
                relations: includeFiles ? ["files"] : undefined,
            });
        } else {
            return this.getRepository(transaction).find({
                where: {
                    bucketToken,
                },
                relations: includeFiles ? ["files"] : undefined,
            });
        }
    }
}
