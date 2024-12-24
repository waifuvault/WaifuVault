import { Inject, Injectable } from "@tsed/di";
import { AlbumDao } from "../dao/AlbumDao.js";
import { AlbumModel } from "../../model/db/Album.model.js";
import { FileRepo } from "./FileRepo.js";
import { FileUploadModel } from "../../model/db/FileUpload.model.js";

@Injectable()
export class AlbumRepo {
    public constructor(
        @Inject() private albumDao: AlbumDao,
        @Inject() private fileRepo: FileRepo,
    ) {}

    public async saveOrUpdateAlbum(album: AlbumModel): Promise<AlbumModel> {
        const r = await this.albumDao.saveOrUpdateAlbum(album);
        if (r.files) {
            this.fileRepo.invalidateCache(r.files.map(f => f.token));
        }
        return r;
    }

    public async deleteAlbum(albumToken: string, deleteFiles = false): Promise<boolean> {
        if (deleteFiles) {
            // if we want to delete files, then the cascade can delete them
            return this.albumDao.deleteAlbum(albumToken);
        }
        const [res, files] = await this.albumDao.dataSource.transaction(async entityManager => {
            const album = await this.albumDao.getAlbum(albumToken, entityManager);
            const filesRemoved: FileUploadModel[] = [];
            if (album && album.files) {
                filesRemoved.push(...album.files);
                album.removeFiles(album.files);
                await this.albumDao.saveOrUpdateAlbum(album, entityManager);
            }
            return Promise.all([this.albumDao.deleteAlbum(albumToken, entityManager), filesRemoved]);
        });
        if (res) {
            this.fileRepo.invalidateCache(files.map(f => f.token));
        }
        return res;
    }

    public getAlbum(id: string | number): Promise<AlbumModel | null> {
        return this.albumDao.getAlbum(id);
    }

    public albumNameExists(name: string, bucketToken: string): Promise<boolean> {
        return this.albumDao.albumNameExists(name, bucketToken);
    }
}
