import { Inject, Injectable } from "@tsed/di";
import { AlbumDao } from "../dao/AlbumDao.js";
import { AlbumModel } from "../../model/db/Album.model.js";

@Injectable()
export class AlbumRepo {
    public constructor(@Inject() private albumDao: AlbumDao) {}

    public saveOrUpdateAlbum(album: AlbumModel): Promise<AlbumModel> {
        return this.albumDao.saveOrUpdateAlbum(album);
    }

    public deleteAlbum(albumToken: string): Promise<boolean> {
        return this.albumDao.deleteAlbum(albumToken);
    }

    public getAlbum(id: string | number): Promise<AlbumModel | null> {
        return this.albumDao.getAlbum(id);
    }

    public albumNameExists(name: string, bucketToken: string): Promise<boolean> {
        return this.albumDao.albumNameExists(name, bucketToken);
    }
}
